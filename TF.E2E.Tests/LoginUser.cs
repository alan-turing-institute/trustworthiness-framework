using DevExpress.EasyTest.Framework;
using System;
using System.Linq;
using Xunit;

[assembly: CollectionBehavior(DisableTestParallelization = true)]
namespace TF.Module.E2E.Tests {
	public class TFLoginUserTests : IDisposable {
        const string WebAppName = "TF";
        const string AppDBName = "TF";

        EasyTestFixtureContext FixtureContext { get; } = new EasyTestFixtureContext();

		public TFLoginUserTests() {
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

        [Theory]
        [InlineData(WebAppName)]
        public void TestLoginFailed(string applicationName) {
            var appContext = FixtureContext.CreateApplicationContext(applicationName);
            appContext.RunApplication();
            appContext.GetForm().FillForm(
                ("User Name", "InvalidUser"),
                ("Password", "InvalidPassword")
            );
            appContext.GetAction("Log In").Execute();
            // having failed, we should have a login action again
            Assert.NotNull(appContext.GetAction("Log In"));
        }

        [Theory]
        [InlineData(WebAppName)]
        public void TestLoginSuccess(string applicationName)
        {
            var appContext = FixtureContext.CreateApplicationContext(applicationName);
            appContext.RunApplication();
            appContext.GetForm().FillForm(
                ("User Name", "Admin"),
                ("Password", "")
            );
            appContext.GetAction("Log In").Execute();
            // having succeeded, we should NOT have a login action
            Assert.Null(appContext.GetAction("Log In"));
        }

        [Theory]
        [InlineData(WebAppName)]
        public void TestLoginFailsThreeTimes(string applicationName)
        {
            var appContext = FixtureContext.CreateApplicationContext(applicationName);
            appContext.RunApplication();
            // 
            int retries = 3;
            while (retries-- > 0)
            {
                // try to login
                appContext.GetForm().FillForm(
                    ("User Name", "InvalidUser"),
                    ("Password", "InvalidPassword")
                );
                appContext.GetAction("Log In").Execute();
                //
                if (retries > 0)
                {
                    // we should be able to try again
                    Assert.NotNull(appContext.GetAction("Log In"));
                }
                else
                {
                    Assert.Null(appContext.GetAction("Log In"));
                }
            }
        }
    }
}
