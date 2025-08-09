"use client";

import { ProtectedLayout } from "@/components/layout/ProtectedLayout";
import { AdminNavigation } from "@/components/admin/AdminNavigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useUserStats, useRecentUsers } from "@/hooks/useUserData";
import { Users, UserPlus, Shield, UserCheck, Search, Filter, ArrowLeft, MoreHorizontal } from "lucide-react";
import Link from "next/link";

function UsersHeader() {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-8 w-8 text-purple-600" />
            User Management
          </h1>
          <p className="text-gray-600 mt-1">Manage users, roles, and access permissions across the system</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-2" />
          Filter
        </Button>
        <Button variant="outline" size="sm">
          <Search className="h-4 w-4 mr-2" />
          Search
        </Button>
        <Link href="/admin/users/create">
          <Button size="sm">
            <UserPlus className="h-4 w-4 mr-2" />
            Create Admin
          </Button>
        </Link>
      </div>
    </div>
  );
}

function UserStats() {
  const { stats, loading, error } = useUserStats();

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-8 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="h-12 w-12 bg-gray-200 rounded-full animate-pulse" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="mb-8">
        <CardContent className="p-6 text-center">
          <p className="text-red-600">Error loading user statistics: {error}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!stats) return null;

  const statItems = [
    {
      title: "Total Users",
      value: stats.totalUsers.toLocaleString(),
      subtitle: "All registered users",
      color: "blue",
      icon: Users,
    },
    {
      title: "Admin Users",
      value: stats.adminUsers.toLocaleString(),
      subtitle: "System administrators",
      color: "purple",
      icon: UserCheck,
    },
    {
      title: "Medical Staff",
      value: stats.medicalStaff.toLocaleString(),
      subtitle: "Doctors & pharmacists",
      color: "green",
      icon: Shield,
    },
    {
      title: "Patients",
      value: stats.patients.toLocaleString(),
      subtitle: "Active patients",
      color: "indigo",
      icon: Users,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statItems.map((stat) => (
        <Card key={stat.title}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.subtitle}</p>
              </div>
              <div className={`p-3 rounded-full bg-${stat.color}-100`}>
                <stat.icon className={`h-6 w-6 text-${stat.color}-600`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function RecentUsers() {
  const { data, loading, error } = useRecentUsers(10, 1);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Recent Users</span>
            <Button variant="outline" size="sm" disabled>
              View All
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center space-x-4">
                <div className="h-10 w-10 bg-gray-200 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Users</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-red-600">Error loading recent users: {error}</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data?.users) return null;

  const recentUsers = data.users;

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-100 text-purple-800";
      case "doctor":
        return "bg-blue-100 text-blue-800";
      case "pharmacist":
        return "bg-green-100 text-green-800";
      case "patient":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "suspended":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Recent Users</span>
          <Button variant="outline" size="sm">
            View All
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-medium text-gray-600">User</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Role</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Status</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Last Login</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {recentUsers.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4">
                    <div>
                      <p className="font-medium text-gray-900">{user.name}</p>
                      <p className="text-sm text-gray-500 flex items-center gap-1">
                        {user.email}
                        {user.verified && <UserCheck className="h-3 w-3 text-green-600" />}
                      </p>
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <Badge className={`${getRoleBadgeColor(user.role)} border-0`}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </Badge>
                  </td>
                  <td className="py-3 px-4">
                    <Badge className={`${getStatusBadgeColor(user.status)} border-0`}>
                      {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-sm text-gray-600">{user.lastLogin}</td>
                  <td className="py-3 px-4">
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function UsersPage() {
  const { user } = useAuth();

  // Redirect non-admin users
  if (user?.role !== "admin") {
    return (
      <ProtectedLayout>
        <div className="flex items-center justify-center min-h-[50vh]">
          <Card>
            <CardContent className="p-8 text-center">
              <Shield className="h-12 w-12 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
              <p className="text-gray-600 mb-4">You need administrator privileges to access this page.</p>
              <Link href="/dashboard">
                <Button>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Return to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </ProtectedLayout>
    );
  }

  return (
    <ProtectedLayout>
      <div className="space-y-6">
        {/* Navigation */}
        <div className="bg-white rounded-lg border border-gray-200">
          <AdminNavigation />
        </div>

        {/* Header */}
        <UsersHeader />

        {/* User Statistics */}
        <UserStats />

        {/* Recent Users Table */}
        <RecentUsers />

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link href="/admin/users/create" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <UserPlus className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Create New Admin</h3>
                <p className="text-sm text-gray-600">Add a new administrator to the system</p>
              </CardContent>
            </Card>
          </Link>

          <Link href="/admin/users/admins" className="block">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center">
                <UserCheck className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Manage Admins</h3>
                <p className="text-sm text-gray-600">View and manage all administrator accounts</p>
              </CardContent>
            </Card>
          </Link>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6 text-center">
              <Shield className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h3 className="font-semibold text-gray-900 mb-2">Role Management</h3>
              <p className="text-sm text-gray-600">Configure user roles and permissions</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedLayout>
  );
}
