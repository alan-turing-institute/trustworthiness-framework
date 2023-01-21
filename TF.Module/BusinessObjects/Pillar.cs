using DevExpress.Data.Filtering;
using DevExpress.ExpressApp;
using DevExpress.ExpressApp.ConditionalAppearance;
using DevExpress.ExpressApp.Editors;
using DevExpress.ExpressApp.Model;
using DevExpress.Persistent.Base;
using DevExpress.Persistent.BaseImpl;
using DevExpress.Persistent.Validation;
using DevExpress.Xpo;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Text;

namespace TF.Module.BusinessObjects
{
    [DefaultClassOptions]
    [ImageName("BO_Contact")]
    public class Pillar : BaseObject
    {
        
        public Pillar(Session session)
            : base(session)
        {
        }

        public override void AfterConstruction()
        {
            base.AfterConstruction();
            
        }

        string name;
        string code;
        Assessment assessment;

        [Size(20)]
        [RuleRequiredField(DefaultContexts.Save)]
        public string Code
        {
            get => code;
            set => SetPropertyValue(nameof(Code), ref code, value);
        }

        [Size(200)]
        [RuleRequiredField(DefaultContexts.Save)]
        public string Name
        {
            get => name;
            set => SetPropertyValue(nameof(Name), ref name, value);
        }

        [Association("Pillar-Mechanisms"), Aggregated]
        public XPCollection<Mechanism> Mechanisms => GetCollection<Mechanism>(nameof(Mechanisms));
        

        [Association("Assessment-Pillars")]
        public Assessment Assessment
        {
            get { return assessment; }
            set { SetPropertyValue(nameof(Assessment), ref assessment, value); }
        }
    }
}