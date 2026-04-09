'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../../../src/lib/api';
import { useDemoSession } from '../../../src/lib/session';
import { DemoShell } from '../../../src/components/demo-shell';
import { Card, Notice } from '../../../src/components/ui';

type City = {
  id: string;
  name: string;
  districts: Array<{ id: string; name: string }>;
};

type PlayerProfile = {
  id: string;
  status: string;
  firstName: string;
  lastName: string;
  bio: string | null;
  ntrpSelfRating: string | number | null;
  cityId: string | null;
  districtId: string | null;
};

const emptyForm = {
  firstName: '',
  lastName: '',
  bio: '',
  ntrpSelfRating: '',
  cityId: '',
  districtId: '',
};

export default function PlayerProfilePage() {
  const { session, isLoaded } = useDemoSession();
  const [cities, setCities] = useState<City[]>([]);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!session) {
        return;
      }

      const [citiesResponse, profileResponse] = await Promise.all([
        apiRequest<City[]>('/reference/cities'),
        apiRequest<PlayerProfile | null>('/player/profile/me', {
          session,
        }),
      ]);

      if (citiesResponse.success && citiesResponse.data) {
        setCities(citiesResponse.data);
      }

      if (profileResponse.success && profileResponse.data) {
        const nextProfile = profileResponse.data;
        setProfile(nextProfile);
        setForm({
          firstName: nextProfile.firstName ?? '',
          lastName: nextProfile.lastName ?? '',
          bio: nextProfile.bio ?? '',
          ntrpSelfRating: nextProfile.ntrpSelfRating ? String(nextProfile.ntrpSelfRating) : '',
          cityId: nextProfile.cityId ?? '',
          districtId: nextProfile.districtId ?? '',
        });
      }
    };

    void load();
  }, [session]);

  const districts = useMemo(
    () => cities.find((city) => city.id === form.cityId)?.districts ?? [],
    [cities, form.cityId],
  );

  const submit = async () => {
    if (!session) {
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    const payload = {
      firstName: form.firstName,
      lastName: form.lastName,
      bio: form.bio || undefined,
      ntrpSelfRating: form.ntrpSelfRating ? Number(form.ntrpSelfRating) : undefined,
      cityId: form.cityId || undefined,
      districtId: form.districtId || undefined,
    };

    const response = await apiRequest<PlayerProfile>(profile ? '/player/profile/me' : '/player/profile', {
      method: profile ? 'PATCH' : 'POST',
      session,
      body: JSON.stringify(payload),
    });

    if (!response.success || !response.data) {
      setError(response.error?.message ?? 'Failed to save player profile.');
      setLoading(false);
      return;
    }

    setProfile(response.data);
    setMessage(profile ? 'Player profile updated.' : 'Player profile created.');
    setLoading(false);
  };

  return (
    <DemoShell
      title="My player profile"
      description="Create or update the player profile over the live REST API contract."
    >
      {!isLoaded ? <Notice>Loading session...</Notice> : null}
      {isLoaded && !session ? (
        <Notice kind="error">Sign in on the Demo auth page before editing your player profile.</Notice>
      ) : null}
      {message ? <Notice kind="success">{message}</Notice> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}

      <Card>
        <h3>Player profile form</h3>
        <div className="form-grid">
          <label className="field">
            <span>First name</span>
            <input
              value={form.firstName}
              onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
              disabled={!session}
            />
          </label>

          <label className="field">
            <span>Last name</span>
            <input
              value={form.lastName}
              onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
              disabled={!session}
            />
          </label>

          <label className="field field-wide">
            <span>Bio</span>
            <textarea
              value={form.bio}
              onChange={(event) => setForm((current) => ({ ...current, bio: event.target.value }))}
              disabled={!session}
            />
          </label>

          <label className="field">
            <span>NTRP self rating</span>
            <input
              value={form.ntrpSelfRating}
              onChange={(event) =>
                setForm((current) => ({ ...current, ntrpSelfRating: event.target.value }))
              }
              disabled={!session}
            />
          </label>

          <label className="field">
            <span>City</span>
            <select
              value={form.cityId}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  cityId: event.target.value,
                  districtId: '',
                }))
              }
              disabled={!session}
            >
              <option value="">Select city</option>
              {cities.map((city) => (
                <option key={city.id} value={city.id}>
                  {city.name}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>District</span>
            <select
              value={form.districtId}
              onChange={(event) => setForm((current) => ({ ...current, districtId: event.target.value }))}
              disabled={!session || !form.cityId}
            >
              <option value="">Select district</option>
              {districts.map((district) => (
                <option key={district.id} value={district.id}>
                  {district.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button type="button" className="primary-button" onClick={submit} disabled={!session || loading}>
          {loading ? 'Saving...' : profile ? 'Update profile' : 'Create profile'}
        </button>
      </Card>
    </DemoShell>
  );
}
