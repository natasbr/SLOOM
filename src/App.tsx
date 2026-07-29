/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useAppStore } from './store';
import MainMenu from './components/MainMenu';
import HostView from './components/HostView';
import CastView from './components/CastView';

export default function App() {
  const view = useAppStore(state => state.view);

  return (
    <>
      {view === 'menu' && <MainMenu />}
      {view === 'host' && <HostView />}
      {view === 'cast' && <CastView />}
    </>
  );
}
