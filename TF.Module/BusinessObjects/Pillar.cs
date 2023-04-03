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
    [NavigationItem(false)]
    //[RuleCombinationOfPropertiesIsUnique("PillarCodeUnique", DefaultContexts.Save, "Code, Assessment.Oid")]
    public class Pillar : TFBaseObject
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

        [Association("Pillar-Mechanisms"), Aggregated]
        public XPCollection<Mechanism> Mechanisms => GetCollection<Mechanism>(nameof(Mechanisms));
        

        [Association("Assessment-Pillars")]
        public Assessment Assessment
        {
            get { return assessment; }
            set { SetPropertyValue(nameof(Assessment), ref assessment, value); }
        }

        [Appearance("DesignScorePurple", AppearanceItemType = "ViewItem", TargetItems = "DesignScore",
            Criteria = "!DesignMandatory", Context = "Any", BackColor = "DeepPink", FontColor = "White", Priority = 4)]
        [Appearance("DesignScoreRed", AppearanceItemType = "ViewItem", TargetItems = "DesignScore",
            Criteria = "DesignScore<=33", Context = "Any", BackColor = "Tomato", FontColor = "White", Priority = 3)]
        [Appearance("DesignScoreYellow", AppearanceItemType = "ViewItem", TargetItems = "DesignScore",
            Criteria = "DesignScore<=66", Context = "Any", BackColor = "LemonChiffon", Priority = 2)]
        [Appearance("DesignScoreGreen", AppearanceItemType = "ViewItem", TargetItems = "DesignScore",
            Criteria = "DesignScore>66", Context = "Any", BackColor = "LightGreen", Priority = 1)]
        [PersistentAlias("Iif(!DesignMandatory,0,[Mechanisms][!ExcludeFromAssessment].Sum([DesignWeight])=0,0,[Mechanisms][!ExcludeFromAssessment].Sum([DesignScore]*[DesignWeight])/[Mechanisms][!ExcludeFromAssessment].Sum([DesignWeight]))")]
        public int DesignScore
        {
            get => (int)(EvaluateAlias(nameof(DesignScore)) ?? 0);
        }

        [PersistentAlias("[Mechanisms][!ExcludeFromAssessment And !DesignMandatory].Count() = 0")]
        public bool DesignMandatory
        {
            get => (bool)(EvaluateAlias(nameof(DesignMandatory)) ?? false);
        }

        [Appearance("OperationalScorePurple", AppearanceItemType = "ViewItem", TargetItems = "OperationalScore",
            Criteria = "!OperationalMandatory", Context = "Any", BackColor = "DeepPink", FontColor = "White", Priority = 4)]
        [Appearance("OperationalScoreRed", AppearanceItemType = "ViewItem", TargetItems = "OperationalScore",
            Criteria = "OperationalScore<=33", Context = "Any", BackColor = "Tomato", FontColor = "White", Priority = 3)]
        [Appearance("OperationalScoreYellow", AppearanceItemType = "ViewItem", TargetItems = "OperationalScore",
            Criteria = "OperationalScore<=66", Context = "Any", BackColor = "LemonChiffon", Priority = 2)]
        [Appearance("OperationalScoreGreen", AppearanceItemType = "ViewItem", TargetItems = "OperationalScore",
            Criteria = "OperationalScore>66", Context = "Any", BackColor = "LightGreen", Priority = 1)]
        [PersistentAlias("Iif(!OperationalMandatory,0,[Mechanisms][!ExcludeFromAssessment].Sum([OperationalWeight])=0,0,[Mechanisms][!ExcludeFromAssessment].Sum([OperationalScore]*[OperationalWeight])/[Mechanisms][!ExcludeFromAssessment].Sum([OperationalWeight]))")]
        public int OperationalScore
        {
            get => (int)(EvaluateAlias(nameof(OperationalScore)) ?? 0);
        }

        [PersistentAlias("[Mechanisms][!ExcludeFromAssessment And !OperationalMandatory].Count() = 0")]
        public bool OperationalMandatory
        {
            get => (bool)(EvaluateAlias(nameof(OperationalMandatory)) ?? false);
        }

        [PersistentAlias("[Mechanisms].Count()")]
        public int NoMechanisms
        {
            get => (int)(EvaluateAlias(nameof(NoMechanisms)) ?? 0);
        }
    }
}