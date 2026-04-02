'use client';

import React, { useState, useEffect, useMemo } from 'react';

interface LocationData {
  provinces: {
    name: string;
    code: string;
    type: string;
    typename: string;
    fullname: string;
    wards: {
      name: string;
      code: string;
      type: string;
      typename: string;
      fullname: string;
    }[];
  }[];
}

interface LocationPickerProps {
  province?: string;
  ward?: string;
  addressDetail?: string;
  onChange: (data: { province: string; ward: string; address_detail: string; full_address: string }) => void;
  compact?: boolean;
}

let locationsCache: LocationData | null = null;

export default function LocationPicker({ province = '', ward = '', addressDetail = '', onChange, compact = false }: LocationPickerProps) {
  const [locations, setLocations] = useState<LocationData | null>(locationsCache);
  const [selectedProvince, setSelectedProvince] = useState(province);
  const [selectedWard, setSelectedWard] = useState(ward);
  const [address, setAddress] = useState(addressDetail);
  const [loading, setLoading] = useState(!locationsCache);

  useEffect(() => {
    if (locationsCache) return;
    setLoading(true);
    fetch('/locations.json')
      .then(r => r.json())
      .then(data => {
        locationsCache = data;
        setLocations(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const provinces = useMemo(() =>
    locations?.provinces?.map(p => p.fullname).sort() || [],
  [locations]);

  const wards = useMemo(() => {
    if (!selectedProvince || !locations) return [];
    const prov = locations.provinces.find(p => p.fullname === selectedProvince);
    return prov?.wards?.map(w => w.fullname).sort() || [];
  }, [selectedProvince, locations]);

  const emitChange = (prov: string, w: string, addr: string) => {
    const parts = [addr, w, prov].filter(Boolean);
    onChange({
      province: prov,
      ward: w,
      address_detail: addr,
      full_address: parts.join(', '),
    });
  };

  const handleProvinceChange = (val: string) => {
    setSelectedProvince(val);
    setSelectedWard('');
    emitChange(val, '', address);
  };

  const handleWardChange = (val: string) => {
    setSelectedWard(val);
    emitChange(selectedProvince, val, address);
  };

  const handleAddressChange = (val: string) => {
    setAddress(val);
    emitChange(selectedProvince, selectedWard, val);
  };

  if (loading) {
    return <div className="location-picker-loading">Đang tải danh sách địa chỉ...</div>;
  }

  return (
    <div className={`location-picker ${compact ? 'location-picker--compact' : ''}`}>
      <div className="location-picker__row">
        <div className="location-picker__field">
          <label className="location-picker__label">Tỉnh / Thành phố</label>
          <select
            className="location-picker__select"
            value={selectedProvince}
            onChange={e => handleProvinceChange(e.target.value)}
          >
            <option value="">-- Chọn Tỉnh/Thành --</option>
            {provinces.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        <div className="location-picker__field">
          <label className="location-picker__label">Phường / Xã</label>
          <select
            className="location-picker__select"
            value={selectedWard}
            onChange={e => handleWardChange(e.target.value)}
            disabled={!selectedProvince}
          >
            <option value="">-- Chọn Phường/Xã --</option>
            {wards.map(w => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="location-picker__field">
        <label className="location-picker__label">Địa chỉ cụ thể</label>
        <input
          type="text"
          className="location-picker__input"
          placeholder="Số nhà, đường, tòa nhà..."
          value={address}
          onChange={e => handleAddressChange(e.target.value)}
        />
      </div>
    </div>
  );
}
