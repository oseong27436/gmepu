"use client";

import { useState, useEffect } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import { supabase, type UserProfile } from "@/lib/supabase";
import { getProfile } from "@/lib/auth";
import LocationPermissionScreen from "@/components/LocationPermissionScreen";
import LoginModal from "@/components/LoginModal";
import NicknameSetupModal from "@/components/NicknameSetupModal";
import MapContent from "@/components/MapContent";

export default function MapPage() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [showNicknameSetup, setShowNicknameSetup] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [locationAsked, setLocationAsked] = useState(false);
  const [showMap, setShowMap] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session) loadProfile(data.session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) loadProfile(session.user.id);
      else setProfile(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (userId: string) => {
    const p = await getProfile(userId);
    if (!p) setShowNicknameSetup(true);
    else setProfile(p);
  };

  useEffect(() => {
    const asked = localStorage.getItem("gmepu_location_asked");
    if (asked) setShowMap(true);
    else setLocationAsked(true);
  }, []);

  const handleAllow = () => {
    navigator.geolocation?.getCurrentPosition(() => {});
    localStorage.setItem("gmepu_location_asked", "true");
    setLocationAsked(false);
    setShowMap(true);
  };

  const handleSkip = () => {
    localStorage.setItem("gmepu_location_asked", "true");
    setLocationAsked(false);
    setShowMap(true);
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      {locationAsked && <LocationPermissionScreen onAllow={handleAllow} onSkip={handleSkip} />}
      {showNicknameSetup && session && (
        <NicknameSetupModal
          userId={session.user.id}
          onDone={(p) => { setProfile(p); setShowNicknameSetup(false); }}
        />
      )}
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
      {showMap && (
        <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}>
          <MapContent
            user={session?.user ?? null}
            profile={profile}
            onLoginRequired={() => setShowLoginModal(true)}
          />
        </APIProvider>
      )}
    </div>
  );
}
