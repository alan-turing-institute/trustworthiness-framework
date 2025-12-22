import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ChevronDown, Menu, X, BarChart3, ClipboardList, Users, Home } from "lucide-react";

export default function NavigationHeader() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase();
    }
    if (user?.email) {
      return user.email.substring(0, 2).toUpperCase();
    }
    return "U";
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-primary text-white";
      case "assessor":
        return "bg-secondary text-white";
      case "external":
        return "bg-gray-500 text-white";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const navigationItems = [
    { href: "/", label: "Dashboard", icon: Home, show: true },
    { href: "/users", label: "User Management", icon: Users, show: user?.role === "admin" },
  ];

  return (
    <header className="bg-surface shadow-sm border-b border-gray-200" data-testid="navigation-header">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <h1 className="text-xl font-medium text-primary">Trustworthiness Framework Tool</h1>
            </div>
            <div className="hidden md:block ml-10">
              <div className="flex items-baseline space-x-4">
                {navigationItems.map((item) => (
                  item.show && (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-testid={`nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                      className={`px-3 py-2 rounded-md text-sm font-medium ${
                        location === item.href || (item.href === "/assessment" && location.startsWith("/assessment"))
                          ? "text-primary bg-blue-50"
                          : "text-text-secondary hover:text-text-primary hover:bg-gray-50"
                      }`}
                    >
                      {item.label}
                    </Link>
                  )
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <Badge className={getRoleBadgeColor(user?.role || "external")}>
              {user?.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : "External"}
            </Badge>
            
            {/* Desktop User Menu */}
            <div className="hidden md:block">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 text-text-secondary hover:text-text-primary" data-testid="user-menu">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-primary text-white text-xs">
                        {getInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">
                      {user?.firstName && user?.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : user?.email || "User"}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                    <Link href="/profile">Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.location.href = "/api/logout"} data-testid="logout-button">
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 border-t border-gray-200">
              {navigationItems.map((item) => (
                item.show && (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    data-testid={`mobile-nav-link-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    className={`block px-3 py-2 rounded-md text-base font-medium ${
                      location === item.href || (item.href === "/assessment" && location.startsWith("/assessment"))
                        ? "text-primary bg-blue-50"
                        : "text-text-secondary hover:text-text-primary hover:bg-gray-50"
                    }`}
                  >
                    <item.icon className="inline w-5 h-5 mr-2" />
                    {item.label}
                  </Link>
                )
              ))}
              
              <div className="px-3 py-2 border-t border-gray-200 mt-4">
                <div className="flex items-center space-x-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary text-white text-xs">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium text-text-primary">
                      {user?.firstName && user?.lastName
                        ? `${user.firstName} ${user.lastName}`
                        : user?.email || "User"}
                    </div>
                    <Badge className={`${getRoleBadgeColor(user?.role || "external")} text-xs`}>
                      {user?.role ? (user.role.charAt(0).toUpperCase() + user.role.slice(1)) : "External"}
                    </Badge>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full"
                  data-testid="logout-button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    window.location.href = "/api/logout";
                  }}
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
