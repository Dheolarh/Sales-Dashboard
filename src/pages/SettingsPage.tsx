import React, { useState } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/Tabs'
import { UserPreferences } from '../components/admin/UserPreferences'
import { SystemSettings } from '../components/admin/SystemSettings'
import { Settings, User, Server } from 'lucide-react'

export const SettingsPage: React.FC = () => {
  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <Tabs defaultValue="user" className="space-y-6">
          {/* Header */}
          <div className="border-b border-gray-200 pb-4">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center mb-2">
              <Settings className="h-8 w-8 text-quickcart-600 mr-3 flex-shrink-0" />
              Settings
            </h1>
            <p className="text-gray-600">Manage your preferences and system configuration</p>
          </div>
          
          {/* Tabs */}
          <TabsList className="flex flex-wrap h-auto w-full max-w-md">
            <TabsTrigger value="user" className="flex-1 flex items-center justify-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">User Preferences</span>
              <span className="sm:hidden">User</span>
            </TabsTrigger>
            <TabsTrigger value="system" className="flex-1 flex items-center justify-center gap-2">
              <Server className="h-4 w-4" />
              <span className="hidden sm:inline">System Settings</span>
              <span className="sm:hidden">System</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Content */}
          <TabsContent value="user" className="space-y-6">
            <UserPreferences />
          </TabsContent>

          <TabsContent value="system" className="space-y-6">
            <SystemSettings />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}