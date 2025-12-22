import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import NavigationHeader from "@/components/NavigationHeader";
import AssessmentTable from "@/components/AssessmentTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { isUnauthorizedError } from "@/lib/authUtils";
import { ClipboardList, TrendingUp, Clock, Share } from "lucide-react";
import { useLocation } from "wouter";
import type { AssessmentWithUser } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";

interface Stats {
  total: number;
  completed: number;
  inProgress: number;
  public: number;
}

export default function Home() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const { data: stats, isLoading: statsLoading } = useQuery<Stats>({
    queryKey: ["/api/stats"],
    retry: false,
  });

  const { data: assessments, isLoading: assessmentsLoading, error } = useQuery<AssessmentWithUser[]>({
    queryKey: ["/api/assessments"],
    retry: false,
    staleTime: 0, // Don't use cache
    cacheTime: 0, // Clear immediately
  });

  // Invalidate cache on mount to force fresh data
  useEffect(() => {
    console.log('[Home] Invalidating assessments cache');
    queryClient.invalidateQueries({ queryKey: ["/api/assessments"] });
  }, []);

  useEffect(() => {
    if (error && isUnauthorizedError(error)) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
    }
  }, [error, toast]);

  if (isLoading || statsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <NavigationHeader />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse space-y-8">
            <div className="bg-surface rounded-lg h-24"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-surface rounded-lg h-32"></div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <NavigationHeader />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Section */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-2xl font-medium text-text-primary mb-2">
              Welcome back, {user?.firstName || user?.email || 'User'}
            </h2>
            <p className="text-text-secondary">
              Manage your ID system assessments and track trustworthiness scores across all six pillars.
            </p>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <ClipboardList className="text-primary text-2xl mr-4" />
                  <div>
                    <p className="text-sm font-medium text-text-secondary">Total Assessments</p>
                    <p className="text-2xl font-semibold text-text-primary">{stats.total}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <TrendingUp className="text-secondary text-2xl mr-4" />
                  <div>
                    <p className="text-sm font-medium text-text-secondary">Completed</p>
                    <p className="text-2xl font-semibold text-text-primary">{stats.completed}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Clock className="text-warning text-2xl mr-4" />
                  <div>
                    <p className="text-sm font-medium text-text-secondary">In Progress</p>
                    <p className="text-2xl font-semibold text-text-primary">{stats.inProgress}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center">
                  <Share className="text-accent text-2xl mr-4" />
                  <div>
                    <p className="text-sm font-medium text-text-secondary">Public Assessments</p>
                    <p className="text-2xl font-semibold text-text-primary">{stats.public}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Recent Assessments */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-lg font-medium text-text-primary">Recent Assessments</CardTitle>
              {user?.role !== "external" && (
                <Button 
                  className="bg-primary hover:bg-primary-dark text-white"
                  onClick={() => setLocation("/assessment")}
                >
                  New Assessment
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <AssessmentTable 
              assessments={assessments || []} 
              loading={assessmentsLoading} 
              userRole={user?.role || "external"}
            />
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
