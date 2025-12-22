import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreHorizontal, BarChart3, Edit, Trash2, Eye, Copy, Award } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AssessmentWithUser } from "@shared/schema";

interface AssessmentTableProps {
  assessments: AssessmentWithUser[];
  loading: boolean;
  userRole: string;
}

export default function AssessmentTable({ assessments, loading, userRole }: AssessmentTableProps) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assessmentToDelete, setAssessmentToDelete] = useState<string | null>(null);
  const [selectedAssessments, setSelectedAssessments] = useState<Set<string>>(new Set());
  const [isComparingAssessments, setIsComparingAssessments] = useState(false);

  const deleteAssessmentMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/assessments/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/assessments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ title: "Success", description: "Assessment deleted successfully" });
      setDeleteDialogOpen(false);
      setAssessmentToDelete(null);
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      } else {
        toast({ title: "Error", description: "Failed to delete assessment", variant: "destructive" });
      }
    },
  });

  const cloneAssessmentMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("POST", `/api/assessments/${id}/clone`);
      const data = await response.json();
      console.log('Parsed response data:', data);
      return data;
    },
    onSuccess: (newAssessment) => {
      console.log('Clone success, new assessment:', newAssessment);
      queryClient.invalidateQueries({ queryKey: ["/api/assessments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });
      toast({ 
        title: "Success", 
        description: `Assessment cloned successfully as "${newAssessment?.systemName || 'New Assessment'}"` 
      });
      // Navigate to the new assessment
      if (newAssessment?.id) {
        setLocation(`/assessment/${newAssessment.id}`);
      } else {
        console.error('No ID returned from clone operation:', newAssessment);
        toast({ 
          title: "Warning", 
          description: "Assessment cloned but navigation failed. Check the assessments list.",
          variant: "destructive"
        });
      }
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      } else {
        toast({ title: "Error", description: "Failed to clone assessment", variant: "destructive" });
      }
    },
  });

  const handleDelete = (id: string) => {
    setAssessmentToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleClone = (id: string) => {
    cloneAssessmentMutation.mutate(id);
  };

  const confirmDelete = () => {
    if (assessmentToDelete) {
      deleteAssessmentMutation.mutate(assessmentToDelete);
    }
  };

  const handleCheckboxToggle = (assessmentId: string) => {
    const newSelected = new Set(selectedAssessments);
    if (newSelected.has(assessmentId)) {
      newSelected.delete(assessmentId);
    } else {
      newSelected.add(assessmentId);
    }
    setSelectedAssessments(newSelected);
  };

  const handleCompare = async () => {
    const ids = Array.from(selectedAssessments);
    if (ids.length !== 2) return;

    setIsComparingAssessments(true);
    try {
      const response = await fetch('/api/assessments/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assessmentIds: ids }),
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate comparison');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `assessment-comparison-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({ title: "Success", description: "Comparison PDF generated successfully" });
      setSelectedAssessments(new Set()); // Clear selection
    } catch (error) {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      } else {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to generate comparison",
          variant: "destructive"
        });
      }
    } finally {
      setIsComparingAssessments(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case "in_progress":
        return <Badge className="bg-yellow-100 text-yellow-800">In Progress</Badge>;
      case "draft":
        return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>;
    }
  };

  const getVisibilityBadge = (isPublic: boolean) => {
    return isPublic ? (
      <Badge className="bg-blue-100 text-blue-800">Public</Badge>
    ) : (
      <Badge className="bg-gray-100 text-gray-800">Private</Badge>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      return "Just now";
    } else if (diffInHours < 24) {
      return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    } else if (diffInHours < 48) {
      return "1 day ago";
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays} days ago`;
    }
  };


  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!assessments || assessments.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-text-secondary">No assessments found.</p>
        {userRole !== "external" && (
          <Button 
            className="mt-4 bg-primary hover:bg-primary-dark text-white"
            onClick={() => setLocation("/assessment")}
          >
            Create Your First Assessment
          </Button>
        )}
      </div>
    );
  }

  return (
    <>
      {selectedAssessments.size === 2 && userRole !== "external" && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg flex justify-between items-center">
          <span className="text-sm text-blue-900">
            {selectedAssessments.size} assessments selected
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedAssessments(new Set())}
            >
              Clear Selection
            </Button>
            <Button
              size="sm"
              onClick={handleCompare}
              disabled={isComparingAssessments}
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              {isComparingAssessments ? "Generating..." : "Compare Selected (2)"}
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              {userRole !== "external" && (
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  <span className="sr-only">Select</span>
                </th>
              )}
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                System Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Last Modified
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Visibility
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Owner
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-surface divide-y divide-gray-200">
            {assessments.map((assessment) => (
                <tr
                  key={assessment.id}
                  className={cn(
                    "hover:bg-gray-50",
                    selectedAssessments.has(assessment.id) && "bg-blue-50"
                  )}
                >
                  {userRole !== "external" && (
                    <td className="px-6 py-4">
                      <Checkbox
                        checked={selectedAssessments.has(assessment.id)}
                        onCheckedChange={() => handleCheckboxToggle(assessment.id)}
                        disabled={selectedAssessments.size === 2 && !selectedAssessments.has(assessment.id)}
                      />
                    </td>
                  )}
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-text-primary">
                        {assessment.systemName}
                      </div>
                      {assessment.systemDescription && (
                        <div className="text-sm text-text-secondary">
                          {assessment.systemDescription.length > 60
                            ? `${assessment.systemDescription.substring(0, 60)}...`
                            : assessment.systemDescription}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(assessment.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                    {formatDate((assessment.updatedAt || assessment.createdAt)?.toString() || "")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getVisibilityBadge(assessment.isPublic)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                    {assessment.user.firstName && assessment.user.lastName
                      ? `${assessment.user.firstName} ${assessment.user.lastName}`
                      : assessment.user.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => setLocation(`/results/${assessment.id}`)}
                        >
                          <BarChart3 className="h-4 w-4 mr-2" />
                          View Results
                        </DropdownMenuItem>
                        
                        <DropdownMenuItem
                          onClick={() => setLocation(`/standards/${assessment.id}`)}
                        >
                          <Award className="h-4 w-4 mr-2" />
                          Standards Compliance
                        </DropdownMenuItem>
                        
                        {userRole !== "external" && (
                          <DropdownMenuItem
                            onClick={() => setLocation(`/assessment/${assessment.id}`)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Assessment
                          </DropdownMenuItem>
                        )}
                        
                        {userRole === "external" && (
                          <DropdownMenuItem
                            onClick={() => setLocation(`/assessment/${assessment.id}`)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Assessment
                          </DropdownMenuItem>
                        )}
                        
                        {userRole !== "external" && (
                          <DropdownMenuItem
                            onClick={() => handleClone(assessment.id)}
                            disabled={cloneAssessmentMutation.isPending}
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            {cloneAssessmentMutation.isPending ? "Cloning..." : "Clone Assessment"}
                          </DropdownMenuItem>
                        )}
                        
                        {(userRole === "admin" || 
                          (userRole === "assessor" && assessment.userId === assessment.user.id)) && (
                          <DropdownMenuItem
                            onClick={() => handleDelete(assessment.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the assessment
              and all associated responses.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteAssessmentMutation.isPending}
            >
              {deleteAssessmentMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
