import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';

export interface UserPermission {
  page_name: string;
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

export interface UserPreferences {
  default_homepage?: string;
  theme?: string;
  language?: string;
}

export function useUserPermissions(userId: string) {
  const [permissions, setPermissions] = useState<UserPermission[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>({ default_homepage: 'dashboard' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { userRole } = useAuth();

  useEffect(() => {
    // Only load if we have a valid userId
    if (userId && userId.trim()) {
      loadUserPermissions();
    } else {
      // No userId, just set loading to false
      setLoading(false);
    }
  }, [userId]);

  const loadUserPermissions = async () => {
    // Early return if no userId
    if (!userId || !userId.trim()) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // Try to load permissions
      let perms: UserPermission[] = [];
      try {
        perms = await api.getUserPermissions(userId);
      } catch (err) {
        console.warn('Could not load permissions:', err);
        // Continue with empty permissions
      }

      // Try to load preferences
      let prefs = { default_homepage: 'dashboard' };
      try {
        const loaded = await api.getUserPreferences(userId);
        prefs = loaded || { default_homepage: 'dashboard' };
      } catch (err) {
        console.warn('Could not load preferences:', err);
      }

      setPermissions(Array.isArray(perms) ? perms : []);
      setPreferences(prefs);
    } catch (err: any) {
      console.error('Error loading user permissions:', err);
      setError(err?.message || 'Failed to load permissions');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Check if user has view permission for a page
   * Admin users bypass permissions check and can view all pages
   */
  const canView = (pageName: string): boolean => {
    // Admin users have access to everything
    if (userRole === 'admin') return true;
    
    const perm = permissions.find((p) => p.page_name === pageName);
    return perm?.can_view ?? false;
  };

  /**
   * Check if user has create permission for a page
   * Admin users bypass permissions check
   */
  const canCreate = (pageName: string): boolean => {
    // Admin users have access to everything
    if (userRole === 'admin') return true;
    
    const perm = permissions.find((p) => p.page_name === pageName);
    return perm?.can_create ?? false;
  };

  /**
   * Check if user has edit permission for a page
   * Admin users bypass permissions check
   */
  const canEdit = (pageName: string): boolean => {
    // Admin users have access to everything
    if (userRole === 'admin') return true;
    
    const perm = permissions.find((p) => p.page_name === pageName);
    return perm?.can_edit ?? false;
  };

  /**
   * Check if user has delete permission for a page
   * Admin users bypass permissions check
   */
  const canDelete = (pageName: string): boolean => {
    // Admin users have access to everything
    if (userRole === 'admin') return true;
    
    const perm = permissions.find((p) => p.page_name === pageName);
    return perm?.can_delete ?? false;
  };

  /**
   * Get all permissions for a page
   */
  const getPagePermission = (pageName: string) => {
    return permissions.find((p) => p.page_name === pageName);
  };

  return {
    permissions,
    preferences,
    loading,
    error,
    canView,
    canCreate,
    canEdit,
    canDelete,
    getPagePermission,
    reload: loadUserPermissions,
    isAdmin: userRole === 'admin',
  };
}
