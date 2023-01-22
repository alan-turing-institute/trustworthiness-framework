using DevExpress.Data.Filtering;
using DevExpress.ExpressApp;
using DevExpress.ExpressApp.ConditionalAppearance;
using DevExpress.ExpressApp.DC;
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
    [NavigationItem(false)]
    //[RuleCombinationOfPropertiesIsUnique("MetricCodeUnique", DefaultContexts.Save, "Code, Mechanism.Oid")]
    [Appearance("MetricEditable", Enabled = false, Criteria = "![Mechanism.DetailedAssessment]", Context = "DetailView", TargetItems = "*")]
    public class Metric : BaseObject
    {
        public enum EMetricType
        {
            Boolean,
            Percentage
        }

        public enum EMetricPhase
        {
            Design,
            Operational
        }

        public Metric(Session session)
            : base(session)
        {
        }

        public override void AfterConstruction()
        {
            base.AfterConstruction();

            MetricType = EMetricType.Boolean;
            BooleanValue = false;
            PercentageValue = 0;
            Weight = 1;
            Phase = EMetricPhase.Design;
        }

        int weight;
        EMetricType metricType;
        string description;
        string name;
        string code;
        bool booleanValue;
        int percentageValue;
        Mechanism mechanism;
        EMetricPhase phase;

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

        [ModelDefault("AllowEdit", "False")]
        public EMetricType MetricType
        {
            get => metricType;
            set => SetPropertyValue(nameof(MetricType), ref metricType, value);
        }

        [ModelDefault("AllowEdit", "False")]
        public EMetricPhase Phase
        {
            get => phase;
            set => SetPropertyValue(nameof(Phase), ref phase, value);
        }

        [ImmediatePostData]
        [Appearance("MetricBooleanValueEnable", AppearanceItemType = "ViewItem", TargetItems = "BooleanValue", 
            Criteria = "MetricType = 1", Context = "Any", Enabled = false)]
        [Appearance("MetricBooleanValueStyle", AppearanceItemType = "ViewItem", TargetItems = "BooleanValue",
            Criteria = "MetricType = 0", Context = "Any", BackColor = "AliceBlue", FontStyle = System.Drawing.FontStyle.Bold, Priority = 2)]
        public bool BooleanValue
        {
            get => booleanValue;
            set => SetPropertyValue(nameof(BooleanValue), ref booleanValue, value);
        }

        [ImmediatePostData]
        [RuleRange("PercentageRange", "Save", "0", "100", "Percentage values must be in the range [0-100]")]
        [Appearance("MetricPercentageValueEnable", AppearanceItemType = "ViewItem", TargetItems = "PercentageValue",
            Criteria = "MetricType = 0", Context = "Any", Enabled = false)]
        [Appearance("MetricPercentageValueStyle", AppearanceItemType = "ViewItem", TargetItems = "BooleanValue",
            Criteria = "MetricType = 1", Context = "Any", BackColor = "AliceBlue", FontStyle = System.Drawing.FontStyle.Bold, Priority = 2)]
        public int PercentageValue
        {
            get => percentageValue;
            set => SetPropertyValue(nameof(PercentageValue), ref percentageValue, value);
        }

        [ModelDefault("AllowEdit", "False")]
        [RuleRange("WeightRange", "Save", "0", "10", "Weights must be in the range [0-10]")]
        public int Weight
        {
            get => weight;
            set => SetPropertyValue(nameof(Weight), ref weight, value);
        }

        public string ScoreText
        {
            get => MetricType == EMetricType.Boolean
                ? (BooleanValue ? "Yes" : "No")
                : $"{PercentageValue} %";
        }

        [Appearance("ScoreValueRed", AppearanceItemType = "ViewItem", TargetItems = "ScoreValue",
            Criteria = "ScoreValue<=33", Context = "Any", BackColor = "Salmon", Priority = 3)]
        [Appearance("ScoreValueYellow", AppearanceItemType = "ViewItem", TargetItems = "ScoreValue",
            Criteria = "ScoreValue<=66", Context = "Any", BackColor = "LightYellow", Priority = 2)]
        [Appearance("ScoreValueGreen", AppearanceItemType = "ViewItem", TargetItems = "ScoreValue",
            Criteria = "ScoreValue>66", Context = "Any", BackColor = "LightGreen", Priority = 1)]
        public int ScoreValue
        {
            get => MetricType == EMetricType.Boolean
                ? (BooleanValue ? 100 : 0)
                : PercentageValue;
        }

        [Association("Mechanism-Metrics")]
        public Mechanism Mechanism
        {
            get { return mechanism; }
            set { SetPropertyValue(nameof(Mechanism), ref mechanism, value); }
        }
    }
}