import React, { useEffect } from 'react';
import AppLayout from './layouts/AppLayout';
import LandingPage from './pages/Dashboard/LandingPage';
import { useApplicationStore } from './store/applicationStore';

const App: React.FC = () => {
  const {
    clients,
    configurations,
    refreshClients
  } = useApplicationStore();

  // Initialize the app by loading clients
  useEffect(() => {
    refreshClients();
  }, [refreshClients]);

  const handleStartWizard = (wizardType: 'add-capability' | 'fix-issues' | 'import-config' | 'learn') => {
    console.log('Start wizard:', wizardType);
    // TODO: Implement wizard launching
  };

  const handleNavigateTo = (key: string) => {
    console.log('Navigate to:', key);
    // TODO: Implement navigation
  };

  return (
    <AppLayout>
      <LandingPage
        clients={clients}
        configurations={configurations}
        onStartWizard={handleStartWizard}
        onNavigateTo={handleNavigateTo}
      />
    </AppLayout>
  );
};

export default App;
