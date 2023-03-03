using DevExpress.Data.Filtering;
using DevExpress.ExpressApp;
using DevExpress.ExpressApp.DC;
using DevExpress.ExpressApp.Model;
using DevExpress.Persistent.Base;
using DevExpress.Persistent.Validation;
using DevExpress.Xpo;
using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Linq;
using System.Runtime.CompilerServices;
using System.Text;

namespace TF.Module.BusinessObjects
{
    [DomainComponent]
    [NavigationItem(false)]
    public class AssessmentComparison : IXafEntityObject/*, IObjectSpaceLink*/, INotifyPropertyChanged
    {
        //private IObjectSpace objectSpace;
        private void OnPropertyChanged([CallerMemberName] string propertyName = null)
        {
            PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
        }
        public AssessmentComparison(Assessment assessment1, Assessment assessment2)
        {
            Oid = Guid.NewGuid();
            Pillars = new List<PillarComparison>();
            // fill codes and names
            Code1 = assessment1.Code;
            Name1 = assessment1.Name;
            Code2 = assessment2.Code;
            Name2 = assessment2.Name;
            // fill the comparison
            foreach (var pillar1 in assessment1.Pillars)
            {
                // pillars
                var pillar2 = assessment2.Pillars.SingleOrDefault(p => p.Code == pillar1.Code);
                if (pillar2 != null)
                {
                    var pillarComparison = new PillarComparison()
                    {
                        Code = pillar1.Code,
                        Name = pillar2.Name,
                    };
                    Pillars.Add(pillarComparison);
                    // mechanisms
                    foreach (var mechanism1 in pillar1.Mechanisms)
                    {
                        var mechanism2 = pillar2.Mechanisms.SingleOrDefault(m => m.Code == mechanism1.Code);
                        if (mechanism2 != null)
                        {
                            var mechanismComparison = new MechanismComparison()
                            {
                                Code = mechanism1.Code,
                                Name = mechanism1.Name,
                                DesignWeight = mechanism1.DesignWeight,
                                OperationalWeight = mechanism1.OperationalWeight,
                            };
                            pillarComparison.Mechanisms.Add(mechanismComparison);
                            // metrics
                            foreach (var metric1 in mechanism1.Metrics)
                            {
                                var metric2 = mechanism2.Metrics.SingleOrDefault(m => m.Code == metric1.Code);
                                if (metric2 != null)
                                {
                                    var metricComparison = new MetricComparison()
                                    {
                                        Code = metric1.Code,
                                        Name = metric1.Name,
                                        MetricType = metric1.MetricType,
                                        Weight = metric1.Weight,
                                        Phase = metric1.Phase,
                                        BooleanValue1 = metric1.BooleanValue,
                                        BooleanValue2 = metric2.BooleanValue,
                                        PercentageValue1 = metric1.PercentageValue,
                                        PercentageValue2 = metric2.PercentageValue,
                                    };
                                    mechanismComparison.Metrics.Add(metricComparison);
                                }
                            }
                        }
                    }
                }
            }
        }

        [DevExpress.ExpressApp.Data.Key]
        [Browsable(false)]  // Hide the entity identifier from UI.
        public Guid Oid { get; set; }

        public Assessment Assessment1 { get; set; }
        public Assessment Assessment2 { get; set; }

        public string Code1 { get; set; }
        public string Name1 { get; set; }
        public string Code2 { get; set; }
        public string Name2 { get; set; }

        public List<PillarComparison> Pillars { get; set; }

        #region IXafEntityObject members (see https://documentation.devexpress.com/eXpressAppFramework/clsDevExpressExpressAppIXafEntityObjecttopic.aspx)
        void IXafEntityObject.OnCreated()
        {
            // Place the entity initialization code here.
            // You can initialize reference properties using Object Space methods; e.g.:
            // this.Address = objectSpace.CreateObject<Address>();
        }
        void IXafEntityObject.OnLoaded()
        {
            // Place the code that is executed each time the entity is loaded here.
        }
        void IXafEntityObject.OnSaving()
        {
            // Place the code that is executed each time the entity is saved here.
        }
        #endregion

        #region IObjectSpaceLink members (see https://documentation.devexpress.com/eXpressAppFramework/clsDevExpressExpressAppIObjectSpaceLinktopic.aspx)
        // If you implement this interface, handle the NonPersistentObjectSpace.ObjectGetting event and find or create a copy of the source object in the current Object Space.
        // Use the Object Space to access other entities (see https://documentation.devexpress.com/eXpressAppFramework/CustomDocument113707.aspx).
        //IObjectSpace IObjectSpaceLink.ObjectSpace {
        //    get { return objectSpace; }
        //    set { objectSpace = value; }
        //}
        #endregion

        #region INotifyPropertyChanged members (see http://msdn.microsoft.com/en-us/library/system.componentmodel.inotifypropertychanged(v=vs.110).aspx)
        public event PropertyChangedEventHandler PropertyChanged;
        #endregion
    }
}