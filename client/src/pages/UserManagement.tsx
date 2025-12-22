import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import NavigationHeader from "@/components/NavigationHeader";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { createUserSchema, resetPasswordSchema, type CreateUser, type ResetPassword, type User } from "@shared/schema";
import { UserPlus, Key, Trash2, Edit } from "lucide-react";

const editUserSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email("Invalid email format").optional().or(z.literal("")),
  role: z.enum(["admin", "assessor", "external"]),
  isActive: z.boolean(),
});

type EditUser = z.infer<typeof editUserSchema>;

export default function UserManagement() {
  const { user: currentUser } = useAuth();
  const { toast } = useToast();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Fetch users
  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["/api/users"],
    retry: false,
  });

  // Create user form
  const createForm = useForm<CreateUser>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      username: "",
      email: "",
      firstName: "",
      lastName: "",
      password: "",
      role: "external",
    },
  });

  // Reset password form
  const resetForm = useForm<ResetPassword>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
    },
  });

  // Edit user form
  const editForm = useForm<EditUser>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      role: "external",
      isActive: true,
    },
  });

  // Create user mutation
  const createUserMutation = useMutation({
    mutationFn: async (userData: CreateUser) => {
      const response = await apiRequest("POST", "/api/users", userData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User created successfully",
      });
      setShowCreateDialog(false);
      createForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create user",
        variant: "destructive",
      });
    },
  });

  // Delete user mutation
  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      toast({
        title: "Success",
        description: "User deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete user",
        variant: "destructive",
      });
    },
  });

  // Edit user mutation
  const editUserMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: EditUser }) => {
      const response = await apiRequest("PATCH", `/api/users/${userId}`, data);
      return await response.json();
    },
    onSuccess: (_updatedUser, { userId }) => {
      // Invalidate users list to refresh
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });

      // If editing the current user, also refresh auth context
      if (userId === currentUser?.id) {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      }

      toast({
        title: "Success",
        description: "User updated successfully",
      });
      setShowEditDialog(false);
      setSelectedUser(null);
      editForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update user",
        variant: "destructive",
      });
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: string; data: ResetPassword }) => {
      const response = await apiRequest("POST", `/api/users/${userId}/reset-password`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Password reset successfully",
      });
      setShowResetDialog(false);
      resetForm.reset();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    },
  });

  const onCreateUser = (data: CreateUser) => {
    createUserMutation.mutate(data);
  };

  const onEditUser = (data: EditUser) => {
    if (selectedUserId) {
      editUserMutation.mutate({ userId: selectedUserId, data });
    }
  };

  const onResetPassword = (data: ResetPassword) => {
    resetPasswordMutation.mutate({ userId: selectedUserId, data });
  };

  const handleDeleteUser = (userId: string, username: string) => {
    if (confirm(`Are you sure you want to delete user "${username}"? This action cannot be undone.`)) {
      deleteUserMutation.mutate(userId);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setSelectedUserId(user.id);
    editForm.reset({
      firstName: user.firstName || "",
      lastName: user.lastName || "",
      email: user.email || "",
      role: user.role,
      isActive: user.isActive,
    });
    setShowEditDialog(true);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "destructive";
      case "assessor": return "default";
      case "external": return "secondary";
      default: return "outline";
    }
  };

  if (currentUser?.role !== "admin") {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavigationHeader />
        <div className="flex items-center justify-center h-64">
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-gray-600">
                Access denied. Admin privileges required.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationHeader />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="mt-2 text-gray-600">Manage system users and their permissions</p>
        </div>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>System Users</CardTitle>
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button data-testid="button-create-user">
                  <UserPlus className="w-4 h-4 mr-2" />
                  Create User
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New User</DialogTitle>
                </DialogHeader>
                <form onSubmit={createForm.handleSubmit(onCreateUser)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="username">Username *</Label>
                      <Input
                        id="username"
                        data-testid="input-create-username"
                        {...createForm.register("username")}
                        placeholder="Enter username"
                      />
                      {createForm.formState.errors.username && (
                        <p className="text-sm text-red-600 mt-1">
                          {createForm.formState.errors.username.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        data-testid="input-create-email"
                        {...createForm.register("email")}
                        placeholder="Enter email"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="firstName">First Name</Label>
                      <Input
                        id="firstName"
                        data-testid="input-create-firstname"
                        {...createForm.register("firstName")}
                        placeholder="Enter first name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="lastName">Last Name</Label>
                      <Input
                        id="lastName"
                        data-testid="input-create-lastname"
                        {...createForm.register("lastName")}
                        placeholder="Enter last name"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="password">Password *</Label>
                      <Input
                        id="password"
                        type="password"
                        data-testid="input-create-password"
                        {...createForm.register("password")}
                        placeholder="Enter password (min 8 chars)"
                      />
                      {createForm.formState.errors.password && (
                        <p className="text-sm text-red-600 mt-1">
                          {createForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="role">Role *</Label>
                      <Select
                        value={createForm.watch("role")}
                        onValueChange={(value) => createForm.setValue("role", value as "admin" | "assessor" | "external")}
                      >
                        <SelectTrigger data-testid="select-create-role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="admin">Admin</SelectItem>
                          <SelectItem value="assessor">Assessor</SelectItem>
                          <SelectItem value="external">External</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowCreateDialog(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      data-testid="button-confirm-create"
                      disabled={createUserMutation.isPending}
                    >
                      {createUserMutation.isPending ? "Creating..." : "Create User"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </CardHeader>

          <CardContent>
            {isLoading ? (
              <div className="text-center py-4">Loading users...</div>
            ) : (
              <Table data-testid="user-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Username</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last Login</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user: User) => (
                    <TableRow key={user.id} data-testid={`row-user-${user.id}`}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>
                        {user.firstName || user.lastName 
                          ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                          : "-"
                        }
                      </TableCell>
                      <TableCell>{user.email || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(user.role)}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.isActive ? "default" : "secondary"}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {user.lastLogin 
                          ? new Date(user.lastLogin).toLocaleDateString()
                          : "Never"
                        }
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            data-testid={`button-edit-${user.id}`}
                            onClick={() => handleEditUser(user)}
                          >
                            <Edit className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            data-testid={`button-reset-password-${user.id}`}
                            onClick={() => {
                              setSelectedUserId(user.id);
                              setShowResetDialog(true);
                            }}
                          >
                            <Key className="w-3 h-3" />
                          </Button>
                          {user.id !== currentUser?.id && (
                            <Button
                              size="sm"
                              variant="destructive"
                              data-testid={`button-delete-${user.id}`}
                              onClick={() => handleDeleteUser(user.id, user.username)}
                              disabled={deleteUserMutation.isPending}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Edit User Dialog */}
        <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit User: {selectedUser?.username}</DialogTitle>
            </DialogHeader>
            <form onSubmit={editForm.handleSubmit(onEditUser)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-firstName">First Name</Label>
                  <Input
                    id="edit-firstName"
                    data-testid="input-edit-firstname"
                    {...editForm.register("firstName")}
                    placeholder="Enter first name"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-lastName">Last Name</Label>
                  <Input
                    id="edit-lastName"
                    data-testid="input-edit-lastname"
                    {...editForm.register("lastName")}
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  data-testid="input-edit-email"
                  {...editForm.register("email")}
                  placeholder="Enter email"
                />
                {editForm.formState.errors.email && (
                  <p className="text-sm text-red-600 mt-1">
                    {editForm.formState.errors.email.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="edit-role">Role</Label>
                  <Select
                    value={editForm.watch("role")}
                    onValueChange={(value) => editForm.setValue("role", value as "admin" | "assessor" | "external")}
                  >
                    <SelectTrigger data-testid="select-edit-role">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="assessor">Assessor</SelectItem>
                      <SelectItem value="external">External</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 pt-8">
                  <Checkbox
                    id="edit-isActive"
                    data-testid="checkbox-edit-active"
                    checked={editForm.watch("isActive")}
                    onCheckedChange={(checked) => editForm.setValue("isActive", checked as boolean)}
                  />
                  <Label htmlFor="edit-isActive" className="cursor-pointer">
                    Account Active
                  </Label>
                </div>
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  data-testid="button-confirm-edit"
                  disabled={editUserMutation.isPending}
                >
                  {editUserMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Reset Password Dialog */}
        <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reset User Password</DialogTitle>
            </DialogHeader>
            <form onSubmit={resetForm.handleSubmit(onResetPassword)} className="space-y-4">
              <div>
                <Label htmlFor="newPassword">New Password *</Label>
                <Input
                  id="newPassword"
                  type="password"
                  data-testid="input-new-password"
                  {...resetForm.register("newPassword")}
                  placeholder="Enter new password (min 8 chars)"
                />
                {resetForm.formState.errors.newPassword && (
                  <p className="text-sm text-red-600 mt-1">
                    {resetForm.formState.errors.newPassword.message}
                  </p>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowResetDialog(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  data-testid="button-confirm-reset"
                  disabled={resetPasswordMutation.isPending}
                >
                  {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}