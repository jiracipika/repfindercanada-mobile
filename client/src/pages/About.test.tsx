import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import About from './About';
import { Browser } from '@capacitor/browser';

// Mock Capacitor Browser plugin
jest.mock('@capacitor/browser', () => ({
  Browser: {
    open: jest.fn(),
  },
}));

describe('About Component', () => {
  it('renders the disclaimer and official links correctly', () => {
    render(<About />);

    // Check for disclaimer text
    expect(screen.getByText(/Important Disclaimer:/i)).toBeInTheDocument();
    expect(screen.getByText(/sourced exclusively from Represent by Open North/i)).toBeInTheDocument();

    // Check for data source link
    const openNorthLink = screen.getByRole('link', { name: 'https://represent.opennorth.ca/' });
    expect(openNorthLink).toBeInTheDocument();

    // Check for official links
    expect(screen.getByRole('link', { name: 'https://www.ourcommons.ca/members/en/search' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://sencanada.ca/en/senators/' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'https://www.elections.ca/content.aspx' })).toBeInTheDocument();
  });

  it('opens external links using Capacitor Browser or window.open', () => {
    render(<About />);

    const openNorthLink = screen.getByRole('link', { name: 'https://represent.opennorth.ca/' });
    fireEvent.click(openNorthLink);
    expect(Browser.open).toHaveBeenCalledWith({ url: 'https://represent.opennorth.ca/' });

    const houseOfCommonsLink = screen.getByRole('link', { name: 'https://www.ourcommons.ca/members/en/search' });
    fireEvent.click(houseOfCommonsLink);
    expect(Browser.open).toHaveBeenCalledWith({ url: 'https://www.ourcommons.ca/members/en/search' });
  });
});