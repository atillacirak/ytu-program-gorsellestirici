"use client";

import React from 'react';
import DuoAppView from '../../components/uygun-musun/DuoAppView';

export default function UygunMusunAtillaPage() {
  return (
    <DuoAppView
      myId="atilla"
      partnerId="neva"
      myName="Atilla"
      partnerName="Neva"
      myDefaultAvatar="👨‍💻"
      partnerDefaultAvatar="👩‍🎓"
      roomCode="atilla-neva"
    />
  );
}
