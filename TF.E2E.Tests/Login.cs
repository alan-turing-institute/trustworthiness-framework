using DevExpress.EasyTest.Framework;
using System;
using System.Linq;
using Xunit;

[assembly: CollectionBehavior(DisableTestParallelization = true)]

// To run functional tests for ASP.NET Web Forms and ASP.NET Core Blazor XAF Applications,
// install browser drivers: https://www.selenium.dev/documentation/getting_started/installing_browser_drivers/.
//
// -For Google Chrome: download "chromedriver.exe" from https://chromedriver.chromium.org/downloads.
// -For Microsoft Edge: download "msedgedriver.exe" from https://developer.microsoft.com/en-us/microsoft-edge/tools/webdriver/.
//
// Selenium requires a path to the downloaded driver. Add a folder with the driver to the system's PATH variable.
//
// Refer to the following article for more information: https://docs.devexpress.com/eXpressAppFramework/403852/

namespace TF.Module.E2E.Tests {
	public class TFTests : IDisposable {
        const string WebAppName = "TF";
        const string AppDBName = "TF";

        EasyTestFixtureContext FixtureContext { get; } = new EasyTestFixtureContext();

		public TFTests() {
            FixtureContext.RegisterApplications(
                new WebApplicationOptions(WebAppName, string.Format(@"{0}\..\..\..\..\TF.Web", Environment.CurrentDirectory))
            );
            // FixtureContext.RegisterDatabases(new DatabaseOptions(AppDBName, "TFEasyTest", server: @"(localdb)\mssqllocaldb"));	           
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
                ("Password", "Tf2023!!")
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
