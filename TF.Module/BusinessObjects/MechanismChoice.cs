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
using static TF.Module.BusinessObjects.Metric;

namespace TF.Module.BusinessObjects
{
    [DefaultClassOptions]
    [NavigationItem(false)]
    public class MechanismChoice : BaseObject
    {
        public MechanismChoice(Session session)
            : base(session)
        {
        }

        public override void AfterConstruction()
        {
            base.AfterConstruction();
        }

        int row;
        string name;
        Mechanism mechanism;
        EMetricPhase phase;

        [Size(20)]
        [RuleRequiredField(DefaultContexts.Save)]
        [ModelDefault("AllowEdit", "False")]
        public int Row
        {
            get => row;
            set => SetPropertyValue(nameof(Row), ref row, value);
        }

        [ModelDefault("AllowEdit", "False")]
        public EMetricPhase Phase
        {
            get => phase;
            set => SetPropertyValue(nameof(Phase), ref phase, value);
        }

        [Size(200)]
        [RuleRequiredField(DefaultContexts.Save)]
        [ModelDefault("AllowEdit", "False")]
        public string Name
        {
            get => name;
            set => SetPropertyValue(nameof(Name), ref name, value);
        }

        [Association("Mechanism-Choices")]
        public Mechanism Mechanism
        {
            get { return mechanism; }
            set { SetPropertyValue(nameof(Mechanism), ref mechanism, value); }
        }
    }
}