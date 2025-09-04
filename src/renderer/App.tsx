import React, { useEffect } from 'react';
import { Layout, Typography, Row, Col } from 'antd';
import { ClientListPanel, ServerManagementPanel } from './components';
import ConfigurationEditor from './components/editor/ConfigurationEditor';
import { useApplicationStore } from './store/applicationStore';

const { Header, Content } = Layout;
const { Title } = Typography;

const App: React.FC = () => {
  const {
    clients,
    selectedClient,
    configurations,
    clientsLoading,
    setSelectedClient,
    refreshClients,
    refreshConfiguration
  } = useApplicationStore();

  // Initialize the app by loading clients
  useEffect(() => {
    refreshClients();
  }, [refreshClients]);

  // Load configuration when a client is selected
  useEffect(() => {
    if (selectedClient) {
      refreshConfiguration(selectedClient);
    }
  }, [selectedClient, refreshConfiguration]);

  const selectedClientData = clients.find(c => c.id === selectedClient);
  const selectedConfiguration = selectedClient ? configurations[selectedClient] : undefined;

  return (
    <Layout style={{ height: '100vh' }}>
      <Header style={{ 
        background: '#fff', 
        padding: '0 24px', 
        borderBottom: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center'
      }}>
        <Title level={3} style={{ margin: 0 }}>
          MCP Configuration Manager
        </Title>
      </Header>
      <Content style={{ padding: '24px', overflow: 'auto' }}>
        <Row gutter={[16, 16]} style={{ height: '100%' }}>
          <Col span={6}>
            <ClientListPanel
              clients={clients}
              loading={clientsLoading}
              selectedClient={selectedClient || undefined}
              onClientSelect={setSelectedClient}
              onRefresh={refreshClients}
              configurations={configurations}
            />
          </Col>
          <Col span={6}>
            <ServerManagementPanel
              client={selectedClientData}
              configuration={selectedConfiguration}
              onAddServer={async (server) => {
                console.log('Add server:', server);
                // TODO: Implement add server functionality
              }}
              onEditServer={async (name, server) => {
                console.log('Edit server:', name, server);
                // TODO: Implement edit server functionality
              }}
              onDeleteServer={(name, scope) => console.log('Delete server:', name, scope)}
              onTestServer={async (server) => {
                console.log('Test server:', server);
                // TODO: Implement server testing
                return {
                  success: true,
                  timestamp: new Date()
                };
              }}
            />
          </Col>
          <Col span={12}>
            <ConfigurationEditor
              client={selectedClientData}
              configuration={selectedConfiguration}
              loading={clientsLoading}
              onSave={async (config) => {
                console.log('Save configuration:', config);
                // TODO: Implement save functionality
              }}
              onCancel={() => console.log('Cancel editing')}
              onPreview={(config) => console.log('Preview configuration:', config)}
            />
          </Col>
        </Row>
      </Content>
    </Layout>
  );
};

export default App;
