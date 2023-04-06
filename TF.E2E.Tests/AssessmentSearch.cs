using DevExpress.EasyTest.Framework;
using System;
using System.Linq;
using Xunit;

namespace TF.Module.E2E.Tests {
	public class TFAssessmentSearchTests : IDisposable {
        const string WebAppName = "TF";
        const string AppDBName = "TF";

        EasyTestFixtureContext FixtureContext { get; } = new EasyTestFixtureContext();

		public TFAssessmentSearchTests() {
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

        private static void CreateAssessments(IApplicationContext appContext, int how_many)
        {
            string[] statuses = { "Draft", "Public", "Private" };

            appContext.Navigate("Assessment");
            Enumerable.Range(1, how_many).ToList().ForEach(i => {
                appContext.GetAction("New").Execute();
                appContext.GetForm().FillForm(
                    ("Code", $"TA{i}"),
                    ("Name", $"Test Assessment {i}"),
                    ("Description", $"Test Assessment {i} Description"),
                    ("Status", statuses[(i-1) % statuses.Length])
                );
                appContext.GetAction("Save and Close").Execute();
            });
        }

        [Theory]
        [InlineData(WebAppName)]
        public void TestAssessmentsCanBeSearchedByNames(string applicationName)
        {
            IApplicationContext appContext = Login(applicationName, userName: "Assessor");
            CreateAssessments(appContext, 3);
            // search by name
            appContext.GetAction("Filter by Text").Execute("\"Test Assessment 1\"");
            Assert.Equal(1, appContext.GetGrid("Assessment").GetRowCount());
        }

        [Theory]
        [InlineData(WebAppName)]
        public void TestAssessmentsCanBeSearchedByCode(string applicationName)
        {
            IApplicationContext appContext = Login(applicationName, userName: "Assessor");
            CreateAssessments(appContext, 3);
            // search by name
            appContext.GetAction("Filter by Text").Execute("TA1");
            Assert.Equal(1, appContext.GetGrid("Assessment").GetRowCount());
        }

        [Theory]
        [InlineData(WebAppName)]
        public void TestAssessorsCanSeeAllAssessments(string applicationName)
        {
            IApplicationContext appContext = Login(applicationName, userName: "Assessor");
            CreateAssessments(appContext, 3);
            // check total row count
            Assert.Equal(3, appContext.GetGrid("Assessment").GetRowCount());
        }

        [Theory]
        [InlineData(WebAppName)]
        public void TestAssessorsCanEditAssessments(string applicationName)
        {
            IApplicationContext appContext = Login(applicationName, userName: "Assessor");
            CreateAssessments(appContext, 3);
            // click on assessment TA1
            appContext.GetGrid().ProcessRow(new EasyTestParameter("Code", "TA1"));
            // get detail form 
            var detail = appContext.GetForm();
            Assert.NotNull(detail);
            // check property name
            Assert.Equal("Test Assessment 1", detail.GetPropertyValue("Name"));
        }

        [Theory]
        [InlineData(WebAppName)]
        public void TestExternalsCanOnlySeePublicAssessments(string applicationName)
        {
            IApplicationContext appContext = Login(applicationName, userName: "Assessor");
            CreateAssessments(appContext, 3);
            // logout and relog as external
            appContext.GetAction("Log Off").Execute();
            appContext.GetForm().FillForm(
                ("User Name", "External"),
                ("Password", "")
            );
            appContext.GetAction("Log In").Execute();
            // check total row count
            Assert.Equal(1, appContext.GetGrid("Assessment").GetRowCount());
        }

        [Theory]
        [InlineData(WebAppName)]
        public void TestExternalssCannotEditAssessments(string applicationName)
        {
            IApplicationContext appContext = Login(applicationName, userName: "Assessor");
            CreateAssessments(appContext, 3);
            // logout and relog as external
            appContext.GetAction("Log Off").Execute();
            appContext.GetForm().FillForm(
                ("User Name", "External"),
                ("Password", "")
            );
            appContext.GetAction("Log In").Execute();
            // click on assessment TA1
            appContext.GetGrid().ProcessRow(new EasyTestParameter("Code", "TA2"));
            // get detail form 
            var detail = appContext.GetForm();
            Assert.NotNull(detail);
            // try to save
            var saveAction = appContext.GetAction("Save");
            Assert.Null(saveAction);
        }
    }
}
