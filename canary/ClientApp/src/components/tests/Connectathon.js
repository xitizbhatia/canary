import React, { Component } from 'react';
import { Record } from '../misc/Record';
import { Getter } from '../misc/Getter';
import { Grid, Breadcrumb, Dimmer, Loader, Container, Form, Divider, Header, Icon, Button, Statistic } from 'semantic-ui-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-semantic-toasts';
import { FHIRInfo } from '../misc/info/FHIRInfo';
import report from'../report';

export class Connectathon extends Component {
  displayName = Connectathon.name;

  constructor(props) {
    super(props);
    this.state = { ...this.props, test: null, loading: true, record: null, results: null, fhirInfo: null, running: false };
    this.updateTest = this.updateTest.bind(this);
    this.runTest = this.runTest.bind(this);
    this.updateRecord = this.updateRecord.bind(this);
    this.setEmptyToNull = this.setEmptyToNull.bind(this);
  }

  componentDidMount() {
    var self = this;
    if (!!this.props.match.params.id) {
      axios
        .get(window.API_URL + '/tests/connectathon/' + this.props.match.params.id)
        .then(function(response) {
          var test = response.data;
          test.results = JSON.parse(test.results);
          self.setState({ test: test, fhirInfo: JSON.parse(response.data.referenceRecord.fhirInfo), loading: false });
        })
        .catch(function(error) {
          self.setState({ loading: false }, () => {
            toast({
              type: 'error',
              icon: 'exclamation circle',
              title: 'Error!',
              description: 'There was an error communicating with Canary. The error was: "' + error + '"',
              time: 5000,
            });
          });
        });
    }
  }

  setEmptyToNull(obj) {
    const o = JSON.parse(JSON.stringify(obj));
    Object.keys(o).forEach(key => {
      if (o[key] && typeof o[key] === 'object') o[key] = this.setEmptyToNull(o[key]);
      else if (o[key] === undefined || o[key] === null || (!!!o[key] && o['Type'] !== 'Bool')) o[key] = null;
      // eslint-disable-next-line
      else o[key] = o[key];
    });
    return o;
  }

  updateRecord(record, issues) {
    this.setState({ record: record, issues: issues });
  }

  updateTest(test) {
    this.setState({ test: test });
  }

  runTest() {
    var self = this;
    this.setState({ running: true }, () => {
      axios
        .post(window.API_URL + '/tests/produce/run/' + this.state.test.testId, this.setEmptyToNull(this.state.record.fhirInfo))
        .then(function(response) {
          var test = response.data;
          test.results = JSON.parse(test.results);
          self.setState({ test: test, running: false }, () => {
            document.getElementById('scroll-to').scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
        })
        .catch(function(error) {
          self.setState({ loading: false, running: false }, () => {
            toast({
              type: 'error',
              icon: 'exclamation circle',
              title: 'Error!',
              description: 'There was an error communicating with Canary. The error was: "' + error + '"',
              time: 5000,
            });
          });
        });
    });
  }

  downloadAsFile(contents) {
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(contents));
    element.setAttribute('download', `canary-report-${this.connectathonRecordName(this.props.match.params.id).toLowerCase()}-${new Date().getTime()}.html`);
    element.click();
  }

  connectathonRecordName(id) {
    switch (this.props.match.params.id) {
      case "1":
        return "Cancer";
      case "2":
        return "Opioid Death at Home";
      case "3":
        return "Pregnant";
      case "4":
        return "Car accident at work: Full";
      case "5":
        return "Car accident at work: Partial";
      default:
        return "Undefined"
    }
  }

  render() {
    return (
      <React.Fragment>
        <Grid id="scroll-to">
          <Grid.Row>
            <Breadcrumb>
              <Breadcrumb.Section as={Link} to="/">
                Dashboard
              </Breadcrumb.Section>
              <Breadcrumb.Divider icon="right chevron" />
              <Breadcrumb.Section>Connectathon FHIR Death Records</Breadcrumb.Section>
            </Breadcrumb>
          </Grid.Row>
          {!!this.state.test && this.state.test.completedBool && (
            <Grid.Row className="loader-height">
              <Container>
                <div className="p-b-10" />
                <Statistic.Group widths="three">
                  <Statistic size="large">
                    <Statistic.Value>{this.state.test.total}</Statistic.Value>
                    <Statistic.Label>Properties Checked</Statistic.Label>
                  </Statistic>
                  <Statistic size="large" color="green">
                    <Statistic.Value>
                      <Icon name="check circle" />
                      {this.state.test.correct}
                    </Statistic.Value>
                    <Statistic.Label>Correct</Statistic.Label>
                  </Statistic>
                  <Statistic size="large" color="red">
                    <Statistic.Value>
                      <Icon name="times circle" />
                      {this.state.test.incorrect}
                    </Statistic.Value>
                    <Statistic.Label>Incorrect</Statistic.Label>
                  </Statistic>
                </Statistic.Group>
                <Grid centered columns={1} className="p-t-30 p-b-15">
                  <Button icon labelPosition='left' primary onClick={() => this.downloadAsFile(report(this.state.test, this.connectathonRecordName(this.props.match.params.id)))}><Icon name='download' />Generate Downloadable Report</Button>
                </Grid>
                <div className="p-b-20" />
                <Form size="large">
                  <FHIRInfo fhirInfo={this.state.test.results} editable={false} testMode={true} updateFhirInfo={null} />
                </Form>
              </Container>
            </Grid.Row>
          )}
          {!(this.state.test && this.state.test.completedBool) && !!this.state.loading && (
            <Grid.Row className="loader-height">
              <Container>
                <Dimmer active inverted>
                  <Loader size="massive">Initializing a New Test...</Loader>
                </Dimmer>
              </Container>
            </Grid.Row>
          )}
          {!(this.state.test && this.state.test.completedBool) && !!this.state.test && (
            <React.Fragment>
              <Grid.Row>
                <Container fluid>
                  <Divider horizontal />
                  <Header as="h2" dividing id="step-1">
                    <Icon name="keyboard" />
                    <Header.Content>
                      Step 1: Enter Details
                      <Header.Subheader>Enter the details listed below into your system.</Header.Subheader>
                    </Header.Content>
                  </Header>
                  <div className="p-b-10" />
                  {!!this.state.fhirInfo && (
                    <Form size="large">
                      <FHIRInfo fhirInfo={this.state.fhirInfo} updateFhirInfo={null} editable={false} hideSnippets hideBlanks={true} />
                    </Form>
                  )}
                </Container>
              </Grid.Row>
              <Grid.Row>
                <Container fluid>
                  <Divider horizontal />
                  <Header as="h2" dividing id="step-1">
                    <Icon name="download" />
                    <Header.Content>
                      Step 2: Export Record
                      <Header.Subheader>After entering the record into your system, export it and import it into Canary using the form below.</Header.Subheader>
                    </Header.Content>
                  </Header>
                  <div className="p-b-15" />
                  {!!this.state.issues && this.state.issues.length > 0 && (
                    <Grid.Row id="scroll-to">
                      <Record issues={this.state.issues} showIssues />
                    </Grid.Row>
                  )}
                  <Getter updateRecord={this.updateRecord} allowIje={false} />
                </Container>
              </Grid.Row>
              <Grid.Row>
                <Container fluid>
                  <Divider horizontal />
                  <Header as="h2" dividing className="p-b-5" id="step-1">
                    <Icon name="check circle" />
                    <Header.Content>
                      Step 3: Calculate Results
                      <Header.Subheader>
                        When you have imported the record, click the button below and Canary will calculate the results of the test.
                      </Header.Subheader>
                    </Header.Content>
                  </Header>
                  <div className="p-b-10" />
                  <Button
                    fluid
                    size="huge"
                    primary
                    onClick={this.runTest}
                    loading={this.state.running}
                    disabled={!!!(this.state.record && this.state.record.xml)}
                  >
                    Calculate
                  </Button>
                </Container>
              </Grid.Row>
            </React.Fragment>
          )}
        </Grid>
        <div className="p-b-100" />
      </React.Fragment>
    );
  }
}
