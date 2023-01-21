using DevExpress.Data.Filtering;
using DevExpress.ExpressApp;
using DevExpress.ExpressApp.ConditionalAppearance;
using DevExpress.ExpressApp.Editors;
using DevExpress.ExpressApp.Model;
using DevExpress.Persistent.Base;
using DevExpress.Persistent.BaseImpl;
using DevExpress.Persistent.Validation;
using DevExpress.Xpo;
using DevExpress.XtraCharts;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Text;

namespace TF.Module.BusinessObjects
{
    [DefaultClassOptions]
    [NavigationItem(false)]
    [RuleCombinationOfPropertiesIsUnique("MechanismCodeUnique", DefaultContexts.Save, "Code, Pillar")]

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
            DetailedAssessment = false;
        }

        string operationalQuestion;
        string designQuestion;
        int operationalWeight;
        int designWeight;
        string description;
        string name;
        string code;
        Pillar pillar;
        bool detailedAssessment;

        [Size(20)]
        [RuleRequiredField(DefaultContexts.Save)]
        [ModelDefault("AllowEdit", "False")]
        public string Code
        {
            get => code;
            set => SetPropertyValue(nameof(Code), ref code, value);
        }

        [Size(200)]
        [RuleRequiredField(DefaultContexts.Save)]
        [ModelDefault("AllowEdit", "False")]
        public string Name
        {
            get => name;
            set => SetPropertyValue(nameof(Name), ref name, value);
        }

        [Size(SizeAttribute.Unlimited)]
        [ModelDefault("AllowEdit", "False")]
        public string Description
        {
            get => description;
            set => SetPropertyValue(nameof(Description), ref description, value);
        }

        [RuleRange("DesignWeightRange", "Save", "0", "10", "Weights must be in the range [0-10]")]
        [ModelDefault("AllowEdit", "False")]
        public int DesignWeight
        {
            get => designWeight;
            set => SetPropertyValue(nameof(DesignWeight), ref designWeight, value);
        }

        [RuleRange("OperationalWeightRange", "Save", "0", "10", "Weights must be in the range [0-10]")]
        [ModelDefault("AllowEdit", "False")]
        public int OperationalWeight
        {
            get => operationalWeight;
            set => SetPropertyValue(nameof(OperationalWeight), ref operationalWeight, value);
        }


        [Size(SizeAttribute.Unlimited)]
        [ModelDefault("AllowEdit", "False")]
        public string DesignQuestion
        {
            get => designQuestion;
            set => SetPropertyValue(nameof(DesignQuestion), ref designQuestion, value);
        }

        
        [Size(SizeAttribute.Unlimited)]
        [ModelDefault("AllowEdit", "False")]
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

        [ImmediatePostData]
        public bool DetailedAssessment
        {
            get => detailedAssessment;
            set { SetPropertyValue(nameof(DetailedAssessment), ref detailedAssessment, value); }
        }

        [Appearance("DesignScoreRed", AppearanceItemType = "ViewItem", TargetItems = "DesignScore",
            Criteria = "DesignScore<=33", Context = "Any", BackColor = "Salmon", Priority = 3)]
        [Appearance("DesignScoreYellow", AppearanceItemType = "ViewItem", TargetItems = "DesignScore",
            Criteria = "DesignScore<=66", Context = "Any", BackColor = "LightYellow", Priority = 2)]
        [Appearance("DesignScoreGreen", AppearanceItemType = "ViewItem", TargetItems = "DesignScore",
            Criteria = "DesignScore>66", Context = "Any", BackColor = "LightGreen", Priority = 1)]
        [PersistentAlias("Iif([Metrics][[Phase]=0].Sum([Weight])=0,0,[Metrics][[Phase]=0].Sum([ScoreValue]*[Weight])/[Metrics][[Phase]=0].Sum([Weight]))")]
        public int DesignScore
        {
            get => (int)(EvaluateAlias(nameof(DesignScore)) ?? 0);
        }

        [Appearance("OperationalScoreRed", AppearanceItemType = "ViewItem", TargetItems = "OperationalScore",
            Criteria = "OperationalScore<=33", Context = "Any", BackColor = "Salmon", Priority = 3)]
        [Appearance("OperationalScoreYellow", AppearanceItemType = "ViewItem", TargetItems = "OperationalScore",
            Criteria = "OperationalScore<=66", Context = "Any", BackColor = "LightYellow", Priority = 2)]
        [Appearance("OperationalScoreGreen", AppearanceItemType = "ViewItem", TargetItems = "OperationalScore",
            Criteria = "OperationalScore>66", Context = "Any", BackColor = "LightGreen", Priority = 1)]
        [PersistentAlias("Iif([Metrics][[Phase]=1].Sum([Weight])=0,0,[Metrics][[Phase]=1].Sum([ScoreValue]*[Weight])/[Metrics][[Phase]=1].Sum([Weight]))")]
        public int OperationalScore
        {
            get => (int)(EvaluateAlias(nameof(OperationalScore)) ?? 0);
        }

        [PersistentAlias("[Metrics].Count()")]
        public int NoMetrics
        {
            get => (int)(EvaluateAlias(nameof(NoMetrics)) ?? 0);
        }
    }
}
