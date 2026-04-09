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

type PartnerTypeKey = 'club' | 'school' | 'organizer' | 'store' | 'mixed';

type PartnerProfile = {
  id: string;
  legalName: string;
  brandName: string | null;
  description: string | null;
  verificationStatus: string;
  cityId: string | null;
  districtId: string | null;
  profileTypes: Array<{
    partnerType: {
      key: PartnerTypeKey;
      name: string;
    };
  }>;
};

const partnerTypes: Array<{ key: PartnerTypeKey; label: string }> = [
  { key: 'club', label: 'Club' },
  { key: 'school', label: 'School' },
  { key: 'organizer', label: 'Organizer' },
  { key: 'store', label: 'Store' },
  { key: 'mixed', label: 'Mixed' },
];

export default function PartnerProfilePage() {
  const { session, isLoaded } = useDemoSession();
  const [cities, setCities] = useState<City[]>([]);
  const [profile, setProfile] = useState<PartnerProfile | null>(null);
  const [form, setForm] = useState({
    legalName: '',
    brandName: '',
    description: '',
    cityId: '',
    districtId: '',
    partnerTypes: ['club'] as PartnerTypeKey[],
  });
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!session) {
        return;
      }

      const [citiesResponse, profileResponse] = await Promise.all([
        apiRequest<City[]>('/reference/cities'),
        apiRequest<PartnerProfile | null>('/partner/profile/me', {
          session,
        }),
      ]);

      if (citiesResponse.success && citiesResponse.data) {
        setCities(citiesResponse.data);
      }

      if (profileResponse.success && profileResponse.data) {
        const currentProfile = profileResponse.data;
        setProfile(currentProfile);
        setForm({
          legalName: currentProfile.legalName,
          brandName: currentProfile.brandName ?? '',
          description: currentProfile.description ?? '',
          cityId: currentProfile.cityId ?? '',
          districtId: currentProfile.districtId ?? '',
          partnerTypes: currentProfile.profileTypes.map(({ partnerType }) => partnerType.key),
        });
      }
    };

    void load();
  }, [session]);

  const districts = useMemo(
    () => cities.find((city) => city.id === form.cityId)?.districts ?? [],
    [cities, form.cityId],
  );

  const togglePartnerType = (key: PartnerTypeKey) => {
    setForm((current) => ({
      ...current,
      partnerTypes: current.partnerTypes.includes(key)
        ? current.partnerTypes.filter((item) => item !== key)
        : [...current.partnerTypes, key],
    }));
  };

  const submit = async () => {
    if (!session) {
      return;
    }

    setLoading(true);
    setMessage(null);
    setError(null);

    const response = await apiRequest<PartnerProfile>(
      profile ? '/partner/profile/me' : '/partner/profile',
      {
        method: profile ? 'PATCH' : 'POST',
        session,
        body: JSON.stringify({
          legalName: form.legalName,
          brandName: form.brandName || undefined,
          description: form.description || undefined,
          cityId: form.cityId || undefined,
          districtId: form.districtId || undefined,
          partnerTypes: form.partnerTypes,
        }),
      },
    );

    if (!response.success || !response.data) {
      setError(response.error?.message ?? 'Failed to save partner profile.');
      setLoading(false);
      return;
    }

    setProfile(response.data);
    setMessage(profile ? 'Partner profile updated.' : 'Partner profile created.');
    setLoading(false);
  };

  return (
    <DemoShell
      title="My partner profile"
      description="Create the partner business profile that will later enter verification review."
    >
      {!isLoaded ? <Notice>Loading session...</Notice> : null}
      {isLoaded && !session ? (
        <Notice kind="error">Sign in on the Demo auth page before editing your partner profile.</Notice>
      ) : null}
      {message ? <Notice kind="success">{message}</Notice> : null}
      {error ? <Notice kind="error">{error}</Notice> : null}

      {profile ? (
        <Notice title="Current verification status">{profile.verificationStatus}</Notice>
      ) : null}

      <Card>
        <h3>Partner profile form</h3>
        <div className="form-grid">
          <label className="field">
            <span>Legal name</span>
            <input
              value={form.legalName}
              onChange={(event) => setForm((current) => ({ ...current, legalName: event.target.value }))}
              disabled={!session}
            />
          </label>

          <label className="field">
            <span>Brand name</span>
            <input
              value={form.brandName}
              onChange={(event) => setForm((current) => ({ ...current, brandName: event.target.value }))}
              disabled={!session}
            />
          </label>

          <label className="field field-wide">
            <span>Description</span>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({ ...current, description: event.target.value }))
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

        <div className="checkbox-group">
          {partnerTypes.map((partnerType) => (
            <label key={partnerType.key} className="checkbox-line">
              <input
                type="checkbox"
                checked={form.partnerTypes.includes(partnerType.key)}
                onChange={() => togglePartnerType(partnerType.key)}
                disabled={!session}
              />
              <span>{partnerType.label}</span>
            </label>
          ))}
        </div>

        <button type="button" className="primary-button" onClick={submit} disabled={!session || loading}>
          {loading ? 'Saving...' : profile ? 'Update partner profile' : 'Create partner profile'}
        </button>
      </Card>
    </DemoShell>
  );
}
