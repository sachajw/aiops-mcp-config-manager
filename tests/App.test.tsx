import React from 'react'
import { render, screen } from '@testing-library/react'
import { ConfigProvider } from 'antd'
import App from '../src/renderer/App'

const renderApp = () => {
  return render(
    <ConfigProvider>
      <App />
    </ConfigProvider>
  )
}

describe('App', () => {
  it('renders the main title', () => {
    renderApp()
    expect(screen.getByText('MCP Configuration Manager')).toBeInTheDocument()
  })

  it('renders the server management interface', () => {
    renderApp()
    expect(screen.getByText('Select a client to manage servers')).toBeInTheDocument()
    expect(screen.getByText('Select a client to edit its configuration')).toBeInTheDocument()
  })
})