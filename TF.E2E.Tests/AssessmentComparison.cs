using DevExpress.EasyTest.Framework;
using System;
using System.Linq;
using Xunit;

namespace TF.Module.E2E.Tests {
	public class TFAssessmentComparisonTests : IDisposable {
        const string WebAppName = "TF";
        const string AppDBName = "TF";

        EasyTestFixtureContext FixtureContext { get; } = new EasyTestFixtureContext();

		public TFAssessmentComparisonTests() {
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

        private static void CreateAssessments(IApplicationContext appContext, int how_many)
        {
            appContext.Navigate("Assessment");
            Enumerable.Range(1, how_many).ToList().ForEach(i => {
                appContext.GetAction("New").Execute();
                appContext.GetForm().FillForm(
                    ("Code", $"TA{i}"),
                    ("Name", $"Test Assessment {i}"),
                    ("Description", $"Test Assessment {i} Description"),
                    ("Status", "Public")
                );
                appContext.GetAction("Save and Close").Execute();
            });
        }

        [Theory]
        [InlineData(WebAppName)]
        public void TestAssessmentComparison(string applicationName)
        {
            IApplicationContext appContext = Login(applicationName, userName: "Assessor");
            CreateAssessments(appContext, 2);
            // as assessor
            appContext.Navigate("Assessment");
            appContext.GetGrid().SelectRows("Code", "TA1", "TA2");
            Assert.True(appContext.GetAction("Compare Assessments").Execute());
            appContext.GetAction("Close").Execute();
            // log off
            appContext.GetAction("Log Off").Execute();
            // as external
            appContext.GetForm().FillForm(
                ("User Name", "External"),
                ("Password", "")
            );
            appContext.GetAction("Log In").Execute();
            appContext.Navigate("Assessment");
            appContext.GetGrid().SelectRows("Code", "TA1", "TA2");
            Assert.Null(appContext.GetAction("Compare Assessments"));
        }
    }
}
