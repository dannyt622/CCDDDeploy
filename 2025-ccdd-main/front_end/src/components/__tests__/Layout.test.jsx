import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Layout from '../Layout.jsx';

const topBarSpy = vi.fn();
const sidebarSpy = vi.fn();

vi.mock('../TopBar.jsx', () => ({
  __esModule: true,
  default: (props) => {
    topBarSpy(props);
    return <div data-testid="top-bar">top:{props.title}</div>;
  }
}));

vi.mock('../Sidebar.jsx', () => ({
  __esModule: true,
  default: (props) => {
    sidebarSpy(props);
    return <aside data-testid="sidebar">sidebar</aside>;
  }
}));

describe('Layout', () => {
  beforeEach(() => {
    topBarSpy.mockClear();
    sidebarSpy.mockClear();
  });

  it('renders child content and forwards props to TopBar and Sidebar', () => {
    render(
      <Layout title="Dashboard" breadcrumbs={[{ label: 'Home', to: '/' }]}>
        <p>Child content</p>
      </Layout>
    );

    expect(topBarSpy).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Dashboard', breadcrumbs: [{ label: 'Home', to: '/' }] })
    );
    expect(sidebarSpy).toHaveBeenCalledWith(
      expect.objectContaining({ surfaceClass: expect.stringContaining('bg-role-recorder') })
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
    expect(screen.getByTestId('top-bar')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });
});
