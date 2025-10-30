"use client";

import { AdminNav } from "@/components/admin-nav";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Home } from "lucide-react";
import Link from "next/link";

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="flex h-16 items-center justify-between px-6">
          <h1 className="text-2xl font-bold">Digital Signage Admin</h1>
          <Link href="/">
            <Button variant="ghost" size="icon" title="Go to Home">
              <Home className="h-5 w-5" />
            </Button>
          </Link>
        </div>
      </div>
      <div className="flex">
        <aside className="w-64 border-r p-4">
          <AdminNav />
        </aside>
        <main className="flex-1 p-8">
          <div className="mb-8">
            <h2 className="text-3xl font-bold">Dashboard</h2>
            <p className="text-muted-foreground mt-2">
              Overview of your digital signage system
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle>Locations</CardTitle>
                <CardDescription>Manage your locations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold">0</p>
                    <p className="text-sm text-muted-foreground">Total locations</p>
                  </div>
                  <Link href="/signage/admin/locations">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Location
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Products</CardTitle>
                <CardDescription>Manage your products</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold">0</p>
                    <p className="text-sm text-muted-foreground">Total products</p>
                  </div>
                  <Link href="/signage/admin/products">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Product
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Screens</CardTitle>
                <CardDescription>Manage your display screens</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-3xl font-bold">0</p>
                    <p className="text-sm text-muted-foreground">Active screens</p>
                  </div>
                  <Link href="/signage/admin/screens">
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Screen
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
