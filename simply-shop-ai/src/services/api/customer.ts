import { apiRequest, isApiConfigured, simulateLatency } from "./http";
import type { Address, Customer, CustomerPreferences } from "@/types/commerce";

const demoCustomer: Customer = {
  id: "cus_demo",
  firstName: "Aarav",
  lastName: "Sharma",
  email: "aarav.sharma@example.com",
  phone: "+91 98200 11223",
  addresses: [
    {
      id: "addr_home",
      label: "Home",
      name: "Aarav Sharma",
      phone: "+91 98200 11223",
      addressLine1: "402, Sunrise Residency, Baner Road",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411045",
    },
    {
      id: "addr_work",
      label: "Work",
      name: "Aarav Sharma",
      phone: "+91 98200 11223",
      addressLine1: "7th Floor, Cerebrum IT Park, Kalyani Nagar",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411014",
    },
  ],
  preferences: {
    personalizedRecommendations: true,
    orderUpdatesEmail: true,
    orderUpdatesSms: true,
    marketingEmails: false,
  },
};

export const customerService = {
  async me(): Promise<Customer> {
    if (isApiConfigured()) return apiRequest<Customer>("/customers/me");
    return simulateLatency(demoCustomer, 180);
  },

  async updateProfile(input: Partial<Pick<Customer, "firstName" | "lastName" | "phone">>) {
    if (isApiConfigured()) {
      return apiRequest<Customer>("/customers/me", { method: "PATCH", body: input });
    }
    return simulateLatency({ ...demoCustomer, ...input });
  },

  async updatePreferences(preferences: CustomerPreferences): Promise<Customer> {
    if (isApiConfigured()) {
      return apiRequest<Customer>("/customers/me/preferences", {
        method: "PUT",
        body: preferences,
      });
    }
    return simulateLatency({ ...demoCustomer, preferences });
  },

  async addresses(): Promise<Address[]> {
    if (isApiConfigured()) return apiRequest<Address[]>("/customers/me/addresses");
    return simulateLatency(demoCustomer.addresses);
  },
};
