using DevExpress.EasyTest.Framework;
using System;
using System.Linq;
using Xunit;

namespace TF.Module.E2E.Tests {
	public class TFAssessmentProcessTests : IDisposable {
        const string WebAppName = "TF";
        const string AppDBName = "TF";

        EasyTestFixtureContext FixtureContext { get; } = new EasyTestFixtureContext();

		public TFAssessmentProcessTests() {
            FixtureContext.RegisterApplications(
                new WebApplicationOptions(WebAppName, string.Format(@"{0}\..\..\..\..\TF.Web", Environment.CurrentDirectory))
            );
            // FixtureContext.RegisterDatabases(new DatabaseOptions(AppDBName, "TFEasyTest", server: @"(localdb)\mssqllocaldb"));	
            // 
            // delete file if exists
            string dbfile = "E:/Workspace/TF/TF.Web/Data/TF.db";
            if (System.IO.File.Exists(dbfile))
                System.IO.File.Delete(dbfile);
        }
        public void Dispose() {
            FixtureContext.CloseRunningApplications();
        }

        private IApplicationContext Login(string applicationName, string userName = "Admin", IApplicationContext appContext = null)
        {
            // login
            if(appContext == null)
            {
                appContext = FixtureContext.CreateApplicationContext(applicationName);
                appContext.RunApplication();
            }
            appContext.GetForm().FillForm(
                ("User Name", userName),
                ("Password", "")
            );
            appContext.GetAction("Log In").Execute();
            return appContext;
        }

        private static void CreateAssessment(IApplicationContext appContext)
        {
            // create assessment
            Assert.True(appContext.Navigate("Assessment"));
            var action = appContext.GetAction("New");
            Assert.NotNull(action);
            Assert.True(action.Execute());
            appContext.GetForm().FillForm(
                ("Code", $"TA1"),
                ("Name", $"Test Assessment 1"),
                ("Description", $"Test Assessment 1 Description"),
                ("Status", "Public")
            );
            Assert.True(appContext.GetAction("Save and Close").Execute());
        }

        [Theory]
        [InlineData(WebAppName)]
        public void TestAllUsersCanViewAllPartsAssessment(string applicationName)
        {
            IApplicationContext appContext = Login(applicationName, userName: "Assessor");
            CreateAssessment(appContext);
            // as assessor
            appContext.Navigate("Assessment");
            appContext.GetGrid().ProcessRow(new EasyTestParameter("Code", "TA1"));
            appContext.GetAction("Pillars").Execute();
            Assert.NotNull(appContext.GetGrid("Pillars"));
            appContext.GetGrid("Pillars").ProcessRow(new EasyTestParameter("Name", "Ethics"));
            appContext.GetAction("Mechanisms").Execute();
            Assert.NotNull(appContext.GetGrid("Mechanisms"));
            appContext.GetGrid("Mechanisms").ProcessRow(new EasyTestParameter("Code", "E.E"));
            appContext.GetAction("Operational").Execute();
            Assert.NotNull(appContext.GetGrid("Metrics"));
            appContext.GetAction("Cancel").Execute();
            appContext.GetAction("Cancel").Execute();
            // as external
            appContext.GetAction("Log Off").Execute();
            appContext = Login(applicationName, userName: "External", appContext);
            appContext.Navigate("Assessment");
            appContext.GetGrid().ProcessRow(new EasyTestParameter("Code", "TA1"));
            appContext.GetAction("Pillars").Execute();
            Assert.NotNull(appContext.GetGrid("Pillars"));
            appContext.GetGrid("Pillars").ProcessRow(new EasyTestParameter("Name", "Ethics"));
            appContext.GetAction("Mechanisms").Execute();
            Assert.NotNull(appContext.GetGrid("Mechanisms"));
            appContext.GetGrid("Mechanisms").ProcessRow(new EasyTestParameter("Code", "E.E"));
            appContext.GetAction("Operational").Execute();
            Assert.NotNull(appContext.GetGrid("Metrics"));
        }


        [Theory]
        [InlineData(WebAppName)]
        public void TestStandardImpliesMetrics(string applicationName)
        {
            IApplicationContext appContext = Login(applicationName, userName: "Assessor");
            // create assessment
            appContext.GetAction("New").Execute();
            appContext.GetForm().FillForm(
                ("Code", $"TA1"),
                ("Name", $"Test Assessment 1"),
                ("Description", $"Test Assessment 1 Description")
            );
            // select standards tab
            appContext.GetAction("Standards").Execute();
            // check the HIPAA standard
            int? rowIndex = appContext.GetGrid("Standards").GetRowIndex(new EasyTestParameter("Name", "HIPAA"));
            Assert.NotNull(rowIndex);
            appContext.GetGrid("Standards").FillRow(rowIndex.Value, new EasyTestParameter("Compliant", "True"));
            // save
            appContext.GetAction("Save").Execute();
            // select pillars tab
            appContext.GetAction("Pillars").Execute();
            Assert.NotNull(appContext.GetGrid("Pillars"));
            appContext.GetGrid("Pillars").ProcessRow(new EasyTestParameter("Name", "Ethics"));
            // select mechanisms tab
            appContext.GetAction("Mechanisms").Execute();
            // select mechanism E.E
            appContext.GetGrid("Mechanisms").ProcessRow(new EasyTestParameter("Code", "E.E"));
            // select operational tab
            appContext.GetAction("Operational").Execute();
            // are all metrics checked?
            Assert.Equal("True", appContext.GetGrid("Metrics").GetRow(0, "Boolean Value")[0]);
            Assert.Equal("True", appContext.GetGrid("Metrics").GetRow(1, "Boolean Value")[0]);
        } //Users has full control over their data.



        [Theory]
        [InlineData(WebAppName)]
        public void TestChoicePropagatedToMetrics(string applicationName)
        {
            IApplicationContext appContext = Login(applicationName, userName: "Assessor");
            // create assessment
            appContext.GetAction("New").Execute();
            appContext.GetForm().FillForm(
                ("Code", $"TA1"),
                ("Name", $"Test Assessment 1"),
                ("Description", $"Test Assessment 1 Description")
            );
            // select pillars tab
            appContext.GetAction("Pillars").Execute();
            Assert.NotNull(appContext.GetGrid("Pillars"));
            appContext.GetGrid("Pillars").ProcessRow(new EasyTestParameter("Name", "Ethics"));
            // select mechanisms tab
            appContext.GetAction("Mechanisms").Execute();
            // select mechanism E.E
            appContext.GetGrid("Mechanisms").ProcessRow(new EasyTestParameter("Code", "E.E"));
            // select operational tab
            appContext.GetAction("Operational").Execute();
            // fill
            appContext.GetForm().FillForm(new EasyTestParameter("Selected Operational Choice", "Users has full control over their data."));
            // are all metrics checked?
            Assert.Equal("True", appContext.GetGrid("Metrics").GetRow(0, "Boolean Value")[0]);
            Assert.Equal("True", appContext.GetGrid("Metrics").GetRow(1, "Boolean Value")[0]);
        }


        [Theory]
        [InlineData(WebAppName)]
        public void TestMetricAggregation(string applicationName)
        {
            IApplicationContext appContext = Login(applicationName, userName: "Assessor");
            // create assessment
            appContext.GetAction("New").Execute();
            appContext.GetForm().FillForm(
                ("Code", $"TA1"),
                ("Name", $"Test Assessment 1"),
                ("Description", $"Test Assessment 1 Description")
            );
            // select pillars tab
            appContext.GetAction("Pillars").Execute();
            Assert.NotNull(appContext.GetGrid("Pillars"));
            appContext.GetGrid("Pillars").ProcessRow(new EasyTestParameter("Name", "Ethics"));
            // select mechanisms tab
            appContext.GetAction("Mechanisms").Execute();
            // select mechanism E.E
            appContext.GetGrid("Mechanisms").ProcessRow(new EasyTestParameter("Code", "E.E"));
            // select operational tab
            appContext.GetAction("Operational").Execute();
            // fill
            appContext.GetForm().FillForm(new EasyTestParameter("Selected Operational Choice", "Users has full control over their data."));
            // press ok
            appContext.GetAction("OK").Execute();
            // check the operational score of E.E to be 100
            Assert.Equal("100", appContext.GetGrid("Mechanisms").GetRow(0, "Operational Score")[0]);
            // go back to the pillar
            appContext.GetAction("Pillar").Execute();
            // check the operational score of Ethics to be 20
            Assert.Equal("20", appContext.GetForm().GetPropertyValue("Operational Score"));
        }



        [Theory]
        [InlineData(WebAppName)]
        public void TestMechanismExclusion(string applicationName)
        {
            IApplicationContext appContext = Login(applicationName, userName: "Assessor");
            // create assessment
            appContext.GetAction("New").Execute();
            appContext.GetForm().FillForm(
                ("Code", $"TA1"),
                ("Name", $"Test Assessment 1"),
                ("Description", $"Test Assessment 1 Description")
            );
            // select pillars tab
            appContext.GetAction("Pillars").Execute();
            Assert.NotNull(appContext.GetGrid("Pillars"));
            appContext.GetGrid("Pillars").ProcessRow(new EasyTestParameter("Name", "Ethics"));
            // select mechanisms tab
            appContext.GetAction("Mechanisms").Execute();
            // select mechanism E.E
            appContext.GetGrid("Mechanisms").ProcessRow(new EasyTestParameter("Code", "E.E"));
            // exclude mechanism
            appContext.GetForm().FillForm(new EasyTestParameter("Exclude From Assessment", "True"));
            // select operational tab
            appContext.GetAction("Operational").Execute();
            // fill
            appContext.GetForm().FillForm(new EasyTestParameter("Selected Operational Choice", "Users has full control over their data."));
            // press ok
            appContext.GetAction("OK").Execute();
            // check the operational score of E.E to be 100
            Assert.Equal("100", appContext.GetGrid("Mechanisms").GetRow(0, "Operational Score")[0]);
            // go back to the pillar
            appContext.GetAction("Pillar").Execute();
            // check the operational score of Ethics to be 0
            Assert.Equal("0", appContext.GetForm().GetPropertyValue("Operational Score"));
        }
    }
}
