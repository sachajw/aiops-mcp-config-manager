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

  it('renders the welcome message', () => {
    renderApp()
    expect(screen.getByText('Welcome to MCP Configuration Manager')).toBeInTheDocument()
    expect(
      screen.getByText('Your unified interface for managing Model Context Protocol configurations')
    ).toBeInTheDocument()
  })
})