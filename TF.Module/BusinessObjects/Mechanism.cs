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
    public class Mechanism : BaseObject
    {
        
        public Mechanism(Session session)
            : base(session)
        {
        }

        public override void AfterConstruction()
        {
            base.AfterConstruction();

            DesignWeight = OperationalWeight = 1;
        }

        string operationalQuestion;
        string designQuestion;
        int operationalWeight;
        int designWeight;
        string description;
        string name;
        string code;
        Pillar pillar;

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

        [Size(SizeAttribute.Unlimited)]
        public string Description
        {
            get => description;
            set => SetPropertyValue(nameof(Description), ref description, value);
        }

        [RuleRange("DesignWeightRange", "Save", "0", "10", "Weights must be in the range [0-10]")]
        public int DesignWeight
        {
            get => designWeight;
            set => SetPropertyValue(nameof(DesignWeight), ref designWeight, value);
        }

        [RuleRange("OperationalWeightRange", "Save", "0", "10", "Weights must be in the range [0-10]")]
        public int OperationalWeight
        {
            get => operationalWeight;
            set => SetPropertyValue(nameof(OperationalWeight), ref operationalWeight, value);
        }


        [Size(SizeAttribute.Unlimited)]
        public string DesignQuestion
        {
            get => designQuestion;
            set => SetPropertyValue(nameof(DesignQuestion), ref designQuestion, value);
        }

        
        [Size(SizeAttribute.Unlimited)]
        public string OperationalQuestion
        {
            get => operationalQuestion;
            set => SetPropertyValue(nameof(OperationalQuestion), ref operationalQuestion, value);
        }

        [Association("Mechanism-Metrics"), Aggregated]
        public XPCollection<Metric> Metrics => GetCollection<Metric>(nameof(Metrics));

        [Association("Pillar-Mechanisms")]
        public Pillar Pillar
        {
            get { return pillar; }
            set { SetPropertyValue(nameof(Pillar), ref pillar, value); }
        }
    }
}