using System;
using System.Collections;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.IO;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using FhirDeathRecord;
using canary.Models;

namespace canary.Controllers
{
    [ApiController]
    public class EndpointsController : ControllerBase
    {

        /// <summary>
        /// Creates a new endpoint. Returns its id.
        /// GET /api/endpoints/new
        /// </summary>
        [HttpGet("Endpoints/New")]
        public int New()
        {
            // Find the record in the database and return it
            using (var db = new RecordContext())
            {
                if (db.Endpoints.Count() > 100)
                {
                    // Too many endpoints in existance, delete the oldest to prevent someone from abusing this.
                    // TODO: Probably a smoother way to accomplish this. Investigate.
                    db.Endpoints.Remove(db.Endpoints.FirstOrDefault());
                }
                Endpoint endpoint = new Endpoint();
                db.Endpoints.Add(endpoint);
                db.SaveChanges();
                return endpoint.EndpointId;
            }
        }

        /// <summary>
        /// Given an id, returns the corresponding endpoint.
        /// GET /api/records/{id}
        /// </summary>
        [HttpGet("Endpoints/{id:int}")]
        [HttpGet("Endpoints/Get/{id:int}")]
        public Endpoint Get(int id)
        {
            // Find the record in the database and return it
            using (var db = new RecordContext())
            {
                return db.Endpoints.Where(e => e.EndpointId == id).FirstOrDefault();
            }
        }

        /// <summary>
        /// Lets you post a raw record to Canary, which is processed and added to the Endpoint.
        /// POST /api/endpoints/record/{id:int}
        /// </summary>
        [HttpPost("Endpoints/Record/{id:int}")]
        public IActionResult RecordPost(int id)
        {
            string input;
            using (StreamReader reader = new StreamReader(Request.Body, Encoding.UTF8))
            {
                input = reader.ReadToEnd();
            }
            if (!String.IsNullOrEmpty(input))
            {
                (Record record, List<Dictionary<string, string>> issues) = (null, null);
                if (input.StartsWith("<")) // XML?
                {
                    (record, issues) = Record.CheckGetXml(input, "yes" == "yes" ? true : false); // TODO
                }
                else if (input.StartsWith("{")) // JSON?
                {
                    (record, issues) = Record.CheckGetJson(input, "yes" == "yes" ? true : false);
                }
                else
                {
                    try // IJE?
                    {
                        if (input.Length != 5000)
                        {
                            throw new Exception(); // TODO: Investigate better ways to see if the input is IJE. Do this in the API!
                        }
                        IJEMortality ije = new IJEMortality(input);
                        DeathRecord deathRecord = ije.ToDeathRecord();
                        (record, issues) = (new Record(deathRecord), new List<Dictionary<string, string>> {} );
                    }
                    catch (Exception e)
                    {
                        Console.WriteLine(e.ToString());
                    }
                }
                // If here, likely no issues.
                using (var db = new RecordContext())
                {
                    Endpoint endpoint = db.Endpoints.Where(e => e.EndpointId == id).FirstOrDefault();
                    endpoint.Record = record;
                    endpoint.Issues = issues;
                    db.SaveChanges();
                }
            }
            using (var db = new RecordContext())
            {
                Endpoint endpoint = db.Endpoints.Where(e => e.EndpointId == id).FirstOrDefault();
                endpoint.Issues = new List<Dictionary<string, string>> { new Dictionary<string, string> { { "severity", "error" }, { "message", "The given input does not appear to be valid XML, JSON, or IJE." } } };
                db.SaveChanges();
            }

            return Ok();
        }

    }
}