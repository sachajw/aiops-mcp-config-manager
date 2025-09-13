import React, { useState, useEffect } from 'react';
import { Layout, Breadcrumb } from 'antd';
import Header from './Header';
import Sidebar from './Sidebar';
import useResponsive from '../hooks/useResponsive';
import { useApplicationStore } from '../store/applicationStore';

const { Content } = Layout;

export interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedKey, setSelectedKey] = useState('overview');
  const { isMobile } = useResponsive();

  // Get data from store
  const {
    clients,
    configurations,
    clientsLoading,
    refreshClients
  } = useApplicationStore();

  // Auto-collapse sidebar on mobile
  useEffect(() => {
    if (isMobile) {
      setSidebarCollapsed(true);
    }
  }, [isMobile]);

  // For now, we'll manage selected key through the menu selection
  // TODO: Add proper routing in Phase 3

  const handleMenuToggle = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  const handleMenuSelect = (key: string) => {
    setSelectedKey(key);
    // Auto-collapse on mobile after selection
    if (isMobile) {
      setSidebarCollapsed(true);
    }
    
    // Handle navigation based on menu key
    // This will be expanded when we add routing
    console.log('Navigate to:', key);
  };

  const handleRefresh = async () => {
    try {
      await refreshClients();
    } catch (error) {
      console.error('Failed to refresh:', error);
    }
  };

  // Transform clients data for sidebar
  const aiApps = clients.map(client => ({
    id: client.id,
    name: client.name,
    status: (client.isActive ? 'active' : 'warning') as 'active' | 'warning' | 'inactive',
    capabilityCount: configurations[client.id]?.metadata?.serverCount || 0
  }));

  // Determine system status
  const getSystemStatus = () => {
    if (clientsLoading) return 'warning';
    
    const hasWarnings = clients.some(client => !client.isActive);
    const hasErrors = clients.length === 0;
    
    if (hasErrors) return 'error';
    if (hasWarnings) return 'warning';
    return 'healthy';
  };

  // Generate breadcrumbs based on current selection
  const getBreadcrumbs = () => {
    const breadcrumbs = [{ title: 'Home' }];
    
    switch (selectedKey) {
      case 'overview':
        breadcrumbs.push({ title: 'Your AI Setup Overview' });
        break;
      case 'ai-apps':
        breadcrumbs.push({ title: 'Your AI Apps' });
        break;
      case 'capabilities':
        breadcrumbs.push({ title: 'Available Capabilities' });
        break;
      case 'maintenance':
        breadcrumbs.push({ title: 'Maintenance' });
        break;
      default:
        if (selectedKey.startsWith('app-')) {
          const clientId = selectedKey.replace('app-', '');
          const client = clients.find(c => c.id === clientId);
          breadcrumbs.push({ title: 'Your AI Apps' });
          breadcrumbs.push({ title: client?.name || 'App Details' });
        }
    }
    
    return breadcrumbs;
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Header */}
      <Header
        sidebarCollapsed={sidebarCollapsed}
        onMenuToggle={handleMenuToggle}
        systemStatus={getSystemStatus()}
        onRefresh={handleRefresh}
        onOpenSettings={() => handleMenuSelect('settings')}
        onOpenHelp={() => handleMenuSelect('get-help')}
      />

      <Layout>
        {/* Sidebar */}
        <Sidebar
          collapsed={sidebarCollapsed}
          selectedKey={selectedKey}
          onSelect={handleMenuSelect}
          onCollapse={setSidebarCollapsed}
          aiApps={aiApps}
        />

        {/* Main content */}
        <Layout style={{ padding: 0 }}>
          <Content
            style={{
              margin: 0,
              padding: '24px',
              background: '#f5f5f5',
              minHeight: 280,
              overflow: 'auto'
            }}
          >
            {/* Breadcrumbs */}
            <div style={{ marginBottom: '16px' }}>
              <Breadcrumb items={getBreadcrumbs()} />
            </div>

            {/* Page content */}
            <div style={{ background: '#fff', padding: 0, borderRadius: '8px' }}>
              {children}
            </div>
          </Content>
        </Layout>
      </Layout>
    </Layout>
  );
};

export default AppLayout;