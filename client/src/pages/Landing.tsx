import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Shield, Users, BarChart3, Lock, CheckCircle, Globe } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-surface shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-xl font-medium text-primary">Trustworthiness Framework Tool</h1>
            <Button onClick={() => window.location.href = '/api/login'}>
              Sign In
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl font-bold text-text-primary mb-6">
            Assess ID System Trustworthiness
          </h2>
          <p className="text-xl text-text-secondary mb-8 max-w-3xl mx-auto">
            Comprehensive evaluation tool for identity systems across six critical pillars: 
            Security, Privacy, Ethics, Robustness, Resiliency, and Reliability.
          </p>
          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary-dark text-white"
            onClick={() => window.location.href = '/api/login'}
          >
            Get Started
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-center text-text-primary mb-12">
            Key Features
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <Shield className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Comprehensive Assessment</CardTitle>
                <CardDescription>
                  Evaluate systems across six pillars with detailed metrics
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Users className="h-10 w-10 text-secondary mb-4" />
                <CardTitle>Role-Based Access</CardTitle>
                <CardDescription>
                  Admin, Assessor, and External user roles with appropriate permissions
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <BarChart3 className="h-10 w-10 text-accent mb-4" />
                <CardTitle>Visual Results</CardTitle>
                <CardDescription>
                  Interactive polar diagrams and detailed tabular views of assessment results
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Lock className="h-10 w-10 text-error mb-4" />
                <CardTitle>Secure & Private</CardTitle>
                <CardDescription>
                  Control assessment visibility and maintain data security
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CheckCircle className="h-10 w-10 text-secondary mb-4" />
                <CardTitle>Dual Perspectives</CardTitle>
                <CardDescription>
                  Evaluate both operational and design aspects of your ID systems
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <Globe className="h-10 w-10 text-primary mb-4" />
                <CardTitle>Collaborative Platform</CardTitle>
                <CardDescription>
                  Share public assessments and collaborate with other professionals
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h3 className="text-3xl font-bold text-text-primary mb-6">
            Ready to Assess Your ID System?
          </h3>
          <p className="text-lg text-text-secondary mb-8">
            Join professionals worldwide in ensuring the trustworthiness of identity systems.
          </p>
          <Button 
            size="lg" 
            className="bg-primary hover:bg-primary-dark text-white"
            onClick={() => window.location.href = '/api/login'}
          >
            Sign In to Continue
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-surface border-t border-gray-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-text-secondary">
          <p>&copy; 2024 Trustworthiness Framework Tool. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
