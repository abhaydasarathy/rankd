import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, BarChart2, User, Trophy } from 'lucide-react';

export default function MobileBottomNav() {
  return (
    <nav className="mobile-bottom-nav" aria-label="Mobile Navigation">
      <NavLink to="/overview" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
        <Home size={20} />
        <span>Home</span>
      </NavLink>
      <NavLink to="/my-metrics" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
        <BarChart2 size={20} />
        <span>Metrics</span>
      </NavLink>
      <NavLink to="/profile" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
        <User size={20} />
        <span>Profile</span>
      </NavLink>
      <NavLink to="/leaderboard" className={({ isActive }) => `mobile-nav-item ${isActive ? 'active' : ''}`}>
        <Trophy size={20} />
        <span>Rank</span>
      </NavLink>
    </nav>
  );
}
