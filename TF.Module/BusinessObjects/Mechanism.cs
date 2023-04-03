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
using DevExpress.XtraPrinting;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Text;

namespace TF.Module.BusinessObjects
{
    [DefaultClassOptions]
    [NavigationItem(false)]
    //[RuleCombinationOfPropertiesIsUnique("MechanismCodeUnique", DefaultContexts.Save, "Code, Pillar.Oid")]
    public class Mechanism : TFBaseObject
    {
        
        public Mechanism(Session session)
            : base(session)
        {
        }

        public override void AfterConstruction()
        {
            base.AfterConstruction();

            DesignWeight = OperationalWeight = 1;
            excludeFromAssessment = false;
        }

        string operationalQuestion;
        string designQuestion;
        int operationalWeight;
        int designWeight;
        string description;
        string name;
        string code;
        Pillar pillar;
        MechanismChoice selectedDesignChoice;
        MechanismChoice selectedOperationalChoice;
        bool excludeFromAssessment;

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

        public bool ExcludeFromAssessment
        {             
            get => excludeFromAssessment;
            set => SetPropertyValue(nameof(ExcludeFromAssessment), ref excludeFromAssessment, value);
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

        [Association("Mechanism-Choices"), Aggregated]
        public XPCollection<MechanismChoice> Choices => GetCollection<MechanismChoice>(nameof(Choices));

        [Association("Pillar-Mechanisms")]
        public Pillar Pillar
        {
            get { return pillar; }
            set { SetPropertyValue(nameof(Pillar), ref pillar, value); }
        }

        [ImmediatePostData]
        [Association("Mechanism-MechanismChoiceDesign")]
        [DataSourceProperty("AvailableDesignChoices")]
        public MechanismChoice SelectedDesignChoice
        {
            get { return selectedDesignChoice; }
            set { 
                SetPropertyValue(nameof(SelectedDesignChoice), ref selectedDesignChoice, value);
                if (value == null || IsSaving || IsLoading) return;
                // propagate to metrics, according to rules
                foreach(var metric in Metrics.Where(m => m.Phase == Metric.EMetricPhase.Design))
                {
                    int ruleValue = value.MetricRules.SingleOrDefault(r => r.Metric.Oid == metric.Oid)?.Value ?? 0;
                    if (metric.MetricType == Metric.EMetricType.Boolean)
                        metric.BooleanValue = ruleValue > 0;
                    else
                        metric.PercentageValue = ruleValue;
                }
            }
        }

        [Browsable(false)]
        public XPCollection<MechanismChoice> AvailableDesignChoices
        {
            get => new XPCollection<MechanismChoice>(Session, Choices.Where(c => c.Phase == Metric.EMetricPhase.Design));
        }

        [ImmediatePostData]
        [Association("Mechanism-MechanismChoiceOperational")]
        [DataSourceProperty("AvailableOperationalChoices")]
        public MechanismChoice SelectedOperationalChoice
        {
            get { return selectedOperationalChoice; }
            set { 
                SetPropertyValue(nameof(SelectedOperationalChoice), ref selectedOperationalChoice, value);
                if (value == null || IsSaving || IsLoading) return;
                // propagate to metrics, according to rules
                foreach (var metric in Metrics.Where(m => m.Phase == Metric.EMetricPhase.Operational))
                {
                    int ruleValue = value.MetricRules.SingleOrDefault(r => r.Metric.Oid == metric.Oid)?.Value ?? 0;
                    if (metric.MetricType == Metric.EMetricType.Boolean)
                        metric.BooleanValue = ruleValue > 0;
                    else
                        metric.PercentageValue = ruleValue;
                }
            }
        }

        [Browsable(false)]
        public XPCollection<MechanismChoice> AvailableOperationalChoices
        {
            get => new XPCollection<MechanismChoice>(Session, Choices.Where(c => c.Phase == Metric.EMetricPhase.Operational));
        }

        [Appearance("DesignScorePurple", AppearanceItemType = "ViewItem", TargetItems = "DesignScore",
            Criteria = "!ExcludeFromAssessment And !DesignMandatory", Context = "Any", BackColor = "DeepPink", FontColor = "White", Priority = 4)]
        [Appearance("DesignScoreRed", AppearanceItemType = "ViewItem", TargetItems = "DesignScore",
            Criteria = "!ExcludeFromAssessment And DesignScore<=33", Context = "Any", BackColor = "Tomato", FontColor = "White", Priority = 3)]
        [Appearance("DesignScoreYellow", AppearanceItemType = "ViewItem", TargetItems = "DesignScore",
            Criteria = "!ExcludeFromAssessment And DesignScore<=66", Context = "Any", BackColor = "LemonChiffon", Priority = 2)]
        [Appearance("DesignScoreGreen", AppearanceItemType = "ViewItem", TargetItems = "DesignScore",
            Criteria = "!ExcludeFromAssessment And DesignScore>66", Context = "Any", BackColor = "LightGreen", Priority = 1)]
        [PersistentAlias("Iif(!DesignMandatory,0,[Metrics][[Phase]=0].Sum([Weight])=0,0,[Metrics][[Phase]=0].Sum([ScoreValue]*[Weight])/[Metrics][[Phase]=0].Sum([Weight]))")]
        public int DesignScore
        {
            get => (int)(EvaluateAlias(nameof(DesignScore)) ?? 0);
        }

        [PersistentAlias("[Metrics][[Phase]=0 and [Mandatory] and ScoreValue=0].Count() = 0")]
        public bool DesignMandatory
        {
            get => (bool)(EvaluateAlias(nameof(DesignMandatory)) ?? false);
        }

        [Appearance("OperationalScorePurple", AppearanceItemType = "ViewItem", TargetItems = "OperationalScore",
            Criteria = "!ExcludeFromAssessment And !OperationalMandatory", Context = "Any", BackColor = "DeepPink", FontColor = "White", Priority = 4)]
        [Appearance("OperationalScoreRed", AppearanceItemType = "ViewItem", TargetItems = "OperationalScore",
            Criteria = "!ExcludeFromAssessment And OperationalScore<=33", Context = "Any", BackColor = "Tomato", FontColor = "White", Priority = 3)]
        [Appearance("OperationalScoreYellow", AppearanceItemType = "ViewItem", TargetItems = "OperationalScore",
            Criteria = "!ExcludeFromAssessment And OperationalScore<=66", Context = "Any", BackColor = "LemonChiffon", Priority = 2)]
        [Appearance("OperationalScoreGreen", AppearanceItemType = "ViewItem", TargetItems = "OperationalScore",
            Criteria = "!ExcludeFromAssessment And OperationalScore>66", Context = "Any", BackColor = "LightGreen", Priority = 1)]
        [PersistentAlias("Iif(!OperationalMandatory,0,[Metrics][[Phase]=1].Sum([Weight])=0,0,[Metrics][[Phase]=1].Sum([ScoreValue]*[Weight])/[Metrics][[Phase]=1].Sum([Weight]))")]
        public int OperationalScore
        {
            get => (int)(EvaluateAlias(nameof(OperationalScore)) ?? 0);
        }

        [PersistentAlias("[Metrics][[Phase]=1 and [Mandatory] and ScoreValue=0].Count() = 0")]
        public bool OperationalMandatory
        {
            get => (bool)(EvaluateAlias(nameof(OperationalMandatory)) ?? false);
        }

        [PersistentAlias("[Metrics].Count()")]
        public int NoMetrics
        {
            get => (int)(EvaluateAlias(nameof(NoMetrics)) ?? 0);
        }
    }
}
