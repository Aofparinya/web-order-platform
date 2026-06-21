"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { apiFetch } from "@/lib/api-client";
import type {
  ThaiDistrict,
  ThaiProvince,
  ThaiSubdistrict,
} from "@/types/api";

export interface ThaiAddressValue {
  subdistrict?: string;
  district?: string;
  province: string;
  postalCode: string;
}

interface ThaiAddressFieldsProps {
  value: ThaiAddressValue;
  onChange: (value: ThaiAddressValue) => void;
  basePath?: string;
  disabled?: boolean;
}

export function ThaiAddressFields({
  value,
  onChange,
  basePath = "locations",
  disabled = false,
}: ThaiAddressFieldsProps) {
  const [provinceCode, setProvinceCode] = useState("");
  const [districtCode, setDistrictCode] = useState("");
  const provinces = useQuery({
    queryKey: ["thai-locations", basePath, "provinces"],
    queryFn: () => apiFetch<ThaiProvince[]>(`${basePath}/provinces`),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const effectiveProvinceCode = value.province
    ? provinceCode ||
      String(
        provinces.data?.find((item) => item.nameTh === value.province)?.code ??
          "",
      )
    : "";
  const districts = useQuery({
    queryKey: ["thai-locations", basePath, "districts", effectiveProvinceCode],
    queryFn: () =>
      apiFetch<ThaiDistrict[]>(
        `${basePath}/districts?provinceCode=${effectiveProvinceCode}`,
      ),
    enabled: Boolean(effectiveProvinceCode),
    staleTime: 24 * 60 * 60 * 1000,
  });
  const effectiveDistrictCode = value.district
    ? districtCode ||
      String(
        districts.data?.find((item) => item.nameTh === value.district)?.code ??
          "",
      )
    : "";
  const subdistricts = useQuery({
    queryKey: ["thai-locations", basePath, "subdistricts", effectiveDistrictCode],
    queryFn: () =>
      apiFetch<ThaiSubdistrict[]>(
        `${basePath}/subdistricts?districtCode=${effectiveDistrictCode}`,
      ),
    enabled: Boolean(effectiveDistrictCode),
    staleTime: 24 * 60 * 60 * 1000,
  });

  return (
    <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
      <Select
        aria-label="จังหวัด"
        disabled={disabled || provinces.isLoading}
        value={effectiveProvinceCode}
        onChange={(event) => {
          const code = event.target.value;
          const selected = provinces.data?.find(
            (item) => String(item.code) === code,
          );
          setProvinceCode(code);
          setDistrictCode("");
          onChange({
            ...value,
            province: selected?.nameTh ?? "",
            district: "",
            subdistrict: "",
            postalCode: "",
          });
        }}
      >
        <option value="">เลือกจังหวัด</option>
        {provinces.data?.map((item) => (
          <option key={item.code} value={item.code}>
            {item.nameTh}
          </option>
        ))}
      </Select>
      <Select
        aria-label="เขตหรืออำเภอ"
        disabled={disabled || !effectiveProvinceCode || districts.isLoading}
        value={effectiveDistrictCode}
        onChange={(event) => {
          const code = event.target.value;
          const selected = districts.data?.find(
            (item) => String(item.code) === code,
          );
          setDistrictCode(code);
          onChange({
            ...value,
            district: selected?.nameTh ?? "",
            subdistrict: "",
            postalCode: "",
          });
        }}
      >
        <option value="">เลือกเขต/อำเภอ</option>
        {districts.data?.map((item) => (
          <option key={item.code} value={item.code}>
            {item.nameTh}
          </option>
        ))}
      </Select>
      <Select
        aria-label="แขวงหรือตำบล"
        disabled={disabled || !effectiveDistrictCode || subdistricts.isLoading}
        value={
          subdistricts.data
            ?.find((item) => item.nameTh === value.subdistrict)
            ?.code.toString() ?? ""
        }
        onChange={(event) => {
          const selected = subdistricts.data?.find(
            (item) => String(item.code) === event.target.value,
          );
          onChange({
            ...value,
            subdistrict: selected?.nameTh ?? "",
            postalCode: selected?.postalCode ?? "",
          });
        }}
      >
        <option value="">เลือกแขวง/ตำบล</option>
        {subdistricts.data?.map((item) => (
          <option key={item.code} value={item.code}>
            {item.nameTh}
          </option>
        ))}
      </Select>
      <Input
        aria-label="รหัสไปรษณีย์"
        placeholder="รหัสไปรษณีย์"
        value={value.postalCode}
        readOnly
        disabled={disabled}
      />
    </div>
  );
}
