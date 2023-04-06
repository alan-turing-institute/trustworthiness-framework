using DevExpress.EasyTest.Framework;
using System;
using System.Linq;
using Xunit;

namespace TF.Module.E2E.Tests {
	public class TFAssessmentCreationTests : IDisposable {
        const string WebAppName = "TF";
        const string AppDBName = "TF";

        EasyTestFixtureContext FixtureContext { get; } = new EasyTestFixtureContext();

		public TFAssessmentCreationTests() {
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

        private IApplicationContext Login(string applicationName, string userName = "Admin")
        {
            // login
            var appContext = FixtureContext.CreateApplicationContext(applicationName);
            appContext.RunApplication();
            appContext.GetForm().FillForm(
                ("User Name", userName),
                ("Password", "")
            );
            appContext.GetAction("Log In").Execute();
            return appContext;
        }

        [Theory]
        [InlineData(WebAppName)]
        public void TestAssessorCanCreateAssessment(string applicationName)
        {
            IApplicationContext appContext = Login(applicationName, userName: "Assessor");
            // create assessment
            Assert.True(appContext.Navigate("Assessment"));
            var action = appContext.GetAction("New");
            Assert.NotNull(action);
            Assert.True(action.Execute());
            appContext.GetForm().FillForm(
                ("Code", $"TA1"),
                ("Name", $"Test Assessment 1"),
                ("Description", $"Test Assessment 1 Description")
            );
            Assert.True(appContext.GetAction("Save and Close").Execute());
        }

        [Theory]
        [InlineData(WebAppName)]
        public void TestExternalCanCreateAssessment(string applicationName)
        {
            IApplicationContext appContext = Login(applicationName, userName: "External");
            // create assessment
            Assert.True(appContext.Navigate("Assessment"));
            var action = appContext.GetAction("New");
            Assert.Null(action);
        }

        [Theory]
        [InlineData(WebAppName)]
        public void TestAssessorCannotCreateAssessmentWithExistingCode(string applicationName)
        {
            IApplicationContext appContext = Login(applicationName, userName: "Assessor");
            // create assessment
            Assert.True(appContext.Navigate("Assessment"));
            var action = appContext.GetAction("New");
            Assert.NotNull(action);
            Assert.True(action.Execute());
            appContext.GetForm().FillForm(
                ("Code", $"TA1"),
                ("Name", $"Test Assessment 1"),
                ("Description", $"Test Assessment 1 Description")
            );
            Assert.True(appContext.GetAction("Save and Close").Execute());
            // create a second assessment
            Assert.True(appContext.GetAction("New").Execute());
            appContext.GetForm().FillForm(
                ("Code", $"TA1"),
                ("Name", $"Test Assessment 1b"),
                ("Description", $"Test Assessment 1b Description")
            );
            appContext.GetAction("Save and Close").Execute();
            // expecting an error
            Assert.NotEmpty(appContext.GetValidation().GetValidationMessages());
        }


        [Theory]
        [InlineData(WebAppName)]
        public void TestAssessorCanCreateAssessmentFromPrevious(string applicationName)
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
            // select ethic pillar
            appContext.GetGrid("Pillars").ProcessRow(new EasyTestParameter("Name", "Ethics"));
            // select mechanisms tab
            appContext.GetAction("Mechanisms").Execute();
            // select mechanism E.E
            appContext.GetGrid("Mechanisms").ProcessRow(new EasyTestParameter("Code", "E.E"));
            // select operational tab
            appContext.GetAction("Operational").Execute();
            // check first metric
            appContext.GetGrid("Metrics").FillRow(0, new EasyTestParameter("Boolean Value", "True"));
            // save and close
            appContext.GetAction("OK").Execute();
            appContext.GetAction("OK").Execute();
            appContext.GetAction("Save and Close").Execute();
            // create a second assessment from the previous
            appContext.GetGrid().SelectRows("Code","TA1");
            appContext.GetAction("New Version").Execute();
            // go back to that metric
            appContext.GetAction("Pillars").Execute();
            appContext.GetGrid("Pillars").ProcessRow(new EasyTestParameter("Name", "Ethics"));
            appContext.GetAction("Mechanisms").Execute();
            appContext.GetGrid("Mechanisms").ProcessRow(new EasyTestParameter("Code", "E.E"));
            appContext.GetAction("Operational").Execute();
            // is it checked?
            Assert.Equal("True", appContext.GetGrid("Metrics").GetRow(0, "Boolean Value")[0]);
        }
    }
}
