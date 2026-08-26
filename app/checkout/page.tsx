"use client";

import {
  Check,
  CheckCircle2,
  CreditCard,
  LoaderCircle,
  Lock,
  MapPin,
  MessageCircle,
  ShieldCheck,
  ShoppingBag,
  Truck,
  User,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import Footer from "@/components/Footer";
import Header from "@/components/Header/Header";

import MercadoPagoPaymentBrick from "@/components/MercadoPagoPaymentBrick";

const cardFlags = {
  pix: "https://cdn.sistemawbuy.com.br/img/bandeiras/novo/pix.svg",
  visa: "https://cdn.sistemawbuy.com.br/img/bandeiras/novo/visa.svg",
  master: "https://cdn.sistemawbuy.com.br/img/bandeiras/novo/master.svg",
  boleto: "https://cdn.sistemawbuy.com.br/img/bandeiras/novo/boleto.svg",
};

const brazilianStates = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];

const inputClassName =
  "mt-2 h-[40px] w-full rounded-[5px] border border-[#e5e5e5] px-3 text-[13px] outline-none transition focus:border-[#b98218] focus:ring-2 focus:ring-[#b98218]/10 disabled:cursor-not-allowed disabled:bg-neutral-100";

type PaymentMethod =
  | "pix"
  | "credit_card"
  | "debit_card"
  | "ticket";

type CartItem = {
  id: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  quantity: number;
};

type CheckoutForm = {
  name: string;
  cpf: string;
  email: string;
  phone: string;
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
};

type CheckoutResponse = {
  orderId?: string;
  error?: string;

  order?: {
    id?: string;
    status?: string;
    subtotal?: number;
    shipping?: number;
    discount?: number;
    total?: number;
    expiresAt?: string | null;
  };
};

type ShippingOption = {
  serviceId: string;
  serviceName: string;
  companyId: string | number;
  companyName: string;
  customerPrice: number;
  deliveryTime: number;
  deliveryRange: {
    minimum: number;
    maximum: number;
  };
  currency: string;
  freeShipping: boolean;
};

type ShippingQuoteResponse = {
  success?: boolean;

  quote?: {
    destinationCep?: string;
    subtotal?: number;
    freeShippingEligible?: boolean;
    freeShippingMinimum?: number;
    freeShippingDiscount?: number;
    expiresAt?: string;
    options?: ShippingOption[];
  };

  error?: string;
};

type StoredShippingSelection =
  ShippingOption & {
    destinationCep: string;
    expiresAt?: string;
  };

type CepLookupResponse = {
  success?: boolean;

  address?: {
    cep?: string;
    street?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
  };

  error?: string;
};

type SavedAddress = {
  id: string;
  name: string;
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  number: string;
  complement: string | null;
  isDefault: boolean;
};

type AddressListResponse = {
  addresses?: SavedAddress[];
  error?: string;
};

type AddressCreateResponse = {
  success?: boolean;
  address?: SavedAddress;
  error?: string;
};

const initialForm: CheckoutForm = {
  name: "",
  cpf: "",
  email: "",
  phone: "",
  cep: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  state: "RJ",
};

function formatPrice(
  value: number
): string {
  const safeValue =
    Number.isFinite(value)
      ? value
      : 0;

  return safeValue.toLocaleString(
    "pt-BR",
    {
      style: "currency",
      currency: "BRL",
    }
  );
}

function formatDateTime(
  value: string
): string {
  const date = new Date(value);

  if (
    Number.isNaN(date.getTime())
  ) {
    return "Prazo não informado";
  }

  return date.toLocaleString(
    "pt-BR",
    {
      dateStyle: "short",
      timeStyle: "short",
    }
  );
}

function isValidCartItem(
  value: unknown
): value is CartItem {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const item =
    value as Partial<CartItem>;

  return (
    typeof item.id === "string" &&
    item.id.length > 0 &&
    typeof item.slug === "string" &&
    typeof item.name === "string" &&
    typeof item.image === "string" &&
    typeof item.price === "number" &&
    Number.isFinite(item.price) &&
    item.price > 0 &&
    typeof item.quantity === "number" &&
    Number.isInteger(
      item.quantity
    ) &&
    item.quantity > 0 &&
    item.quantity <= 100
  );
}

function normalizeCartItems(
  value: unknown
): CartItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isValidCartItem)
    .slice(0, 50);
}

function normalizeCep(
  value: string
): string {
  return value
    .replace(/\D/g, "")
    .slice(0, 8);
}

function formatCep(
  value: string
): string {
  const digits =
    normalizeCep(value);

  if (digits.length <= 5) {
    return digits;
  }

  return `${digits.slice(
    0,
    5
  )}-${digits.slice(5)}`;
}

function isShippingOption(
  value: unknown
): value is ShippingOption {
  if (
    typeof value !== "object" ||
    value === null
  ) {
    return false;
  }

  const option =
    value as Partial<ShippingOption>;

  return (
    typeof option.serviceId ===
      "string" &&
    option.serviceId.length > 0 &&
    typeof option.serviceName ===
      "string" &&
    typeof option.companyName ===
      "string" &&
    typeof option.customerPrice ===
      "number" &&
    Number.isFinite(
      option.customerPrice
    ) &&
    option.customerPrice >= 0 &&
    typeof option.deliveryTime ===
      "number" &&
    typeof option.deliveryRange ===
      "object" &&
    option.deliveryRange !== null &&
    Number.isFinite(
      Number(
        option.deliveryRange.minimum
      )
    ) &&
    Number.isFinite(
      Number(
        option.deliveryRange.maximum
      )
    )
  );
}

function readStoredShippingSelection(
  value: string | null
): StoredShippingSelection | null {
  if (!value) {
    return null;
  }

  try {
    const parsed =
      JSON.parse(value) as unknown;

    if (
      !isShippingOption(parsed)
    ) {
      return null;
    }

    const storedMetadata =
      parsed as ShippingOption & {
        destinationCep?: unknown;
        expiresAt?: unknown;
      };

    if (
      typeof storedMetadata.destinationCep !==
        "string" ||
      normalizeCep(
        storedMetadata.destinationCep
      ).length !== 8
    ) {
      return null;
    }

    if (
      typeof storedMetadata.expiresAt ===
        "string" &&
      new Date(
        storedMetadata.expiresAt
      ).getTime() <= Date.now()
    ) {
      return null;
    }

    return {
      ...parsed,
      destinationCep:
        normalizeCep(
          storedMetadata.destinationCep
        ),

      expiresAt:
        typeof storedMetadata.expiresAt ===
          "string"
          ? storedMetadata.expiresAt
          : undefined,
    };
  } catch {
    return null;
  }
}

export default function CheckoutPage() {
  const [
    cartItems,
    setCartItems,
  ] = useState<CartItem[]>([]);

  const [
    form,
    setForm,
  ] = useState<CheckoutForm>(
    initialForm
  );

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    orderId,
    setOrderId,
  ] = useState<string | null>(
    null
  );

  const [
    orderAmount,
    setOrderAmount,
  ] = useState<number | null>(
    null
  );

  const [
    orderExpiresAt,
    setOrderExpiresAt,
  ] = useState<string | null>(
    null
  );

  const [
    selectedPayment,
    setSelectedPayment,
  ] =
    useState<PaymentMethod>(
      "pix"
    );

  const [
    shippingOptions,
    setShippingOptions,
  ] = useState<ShippingOption[]>(
    []
  );

  const [
    selectedShipping,
    setSelectedShipping,
  ] =
    useState<StoredShippingSelection | null>(
      null
    );

  const [
    shippingLoading,
    setShippingLoading,
  ] = useState(false);

  const [
    shippingError,
    setShippingError,
  ] = useState("");

  const [
    shippingQuoteExpiresAt,
    setShippingQuoteExpiresAt,
  ] = useState<string | null>(
    null
  );

  const [
    cepLoading,
    setCepLoading,
  ] = useState(false);

  const [
    cepError,
    setCepError,
  ] = useState("");

  const [
    customerAuthenticated,
    setCustomerAuthenticated,
  ] = useState(false);

  const [
    savedAddresses,
    setSavedAddresses,
  ] = useState<SavedAddress[]>([]);

  const [
    selectedAddressId,
    setSelectedAddressId,
  ] = useState<string | null>(null);

  const [
    usingNewAddress,
    setUsingNewAddress,
  ] = useState(true);

  const [
    addressesLoading,
    setAddressesLoading,
  ] = useState(true);

  const [
    addressesError,
    setAddressesError,
  ] = useState("");

  /*
   * Impede dois envios antes que o React
   * atualize o estado loading.
   */
  const creatingOrderRef =
    useRef(false);

  const lastLookedUpCepRef =
    useRef("");

  useEffect(() => {
    const timer =
      window.setTimeout(() => {
        const checkoutItems =
          window.localStorage.getItem(
            "laico-checkout"
          );

        const storedCartItems =
          window.localStorage.getItem(
            "laico-cart"
          );

        const selectedItems =
          checkoutItems ||
          storedCartItems;

        if (!selectedItems) {
          return;
        }

        try {
          const parsedItems =
            JSON.parse(
              selectedItems
            );

          const validItems =
            normalizeCartItems(
              parsedItems
            );

          setCartItems(
            validItems
          );

          const storedShipping =
            readStoredShippingSelection(
              window.sessionStorage.getItem(
                "laico-shipping-selection"
              )
            );

          if (storedShipping) {
            setSelectedShipping(
              storedShipping
            );

            setShippingOptions([
              storedShipping,
            ]);

            setShippingQuoteExpiresAt(
              storedShipping.expiresAt ??
                null
            );

            setForm((current) => ({
              ...current,
              cep:
                formatCep(
                  storedShipping.destinationCep
                ),
            }));
          } else {
            window.sessionStorage.removeItem(
              "laico-shipping-selection"
            );
          }

          if (
            validItems.length === 0
          ) {
            window.localStorage.removeItem(
              "laico-checkout"
            );
          }
        } catch {
          window.localStorage.removeItem(
            "laico-checkout"
          );
        }
      }, 0);

    return () =>
      window.clearTimeout(timer);
  }, []);

  /*
   * Carrega endereços somente da conta autenticada.
   * Resposta 401 significa checkout como convidado.
   */
  useEffect(() => {
    const controller = new AbortController();

    async function loadSavedAddresses() {
      try {
        const response = await fetch(
          "/api/account/addresses",
          {
            method: "GET",
            credentials: "same-origin",
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (response.status === 401) {
          setCustomerAuthenticated(false);
          setUsingNewAddress(true);
          return;
        }

        const data = (await response.json().catch(
          () => ({})
        )) as AddressListResponse;

        if (!response.ok) {
          throw new Error(
            data.error || "Não foi possível carregar seus endereços."
          );
        }

        const addresses = Array.isArray(data.addresses)
          ? data.addresses
          : [];

        setCustomerAuthenticated(true);
        setSavedAddresses(addresses);

        const preferred =
          addresses.find((address) => address.isDefault) ??
          addresses[0];

        if (preferred) {
          setSelectedAddressId(preferred.id);
          setUsingNewAddress(false);
          setForm((current) => ({
            ...current,
            cep: formatCep(preferred.cep),
            street: preferred.street,
            number: preferred.number,
            complement: preferred.complement ?? "",
            neighborhood: preferred.neighborhood,
            city: preferred.city,
            state: preferred.state,
          }));
        }
      } catch (loadError) {
        if (
          loadError instanceof DOMException &&
          loadError.name === "AbortError"
        ) {
          return;
        }

        setAddressesError(
          loadError instanceof Error
            ? loadError.message
            : "Não foi possível carregar seus endereços."
        );
      } finally {
        if (!controller.signal.aborted) {
          setAddressesLoading(false);
        }
      }
    }

    void loadSavedAddresses();

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const cep =
      normalizeCep(form.cep);

    if (
      orderId ||
      cep.length !== 8 ||
      lastLookedUpCepRef.current ===
        cep
    ) {
      return;
    }

    const controller =
      new AbortController();

    const timer =
      window.setTimeout(
        async () => {
          setCepLoading(true);
          setCepError("");

          try {
            const response =
              await fetch(
                `/api/address/cep/${cep}`,
                {
                  method: "GET",
                  cache: "no-store",
                  credentials:
                    "same-origin",
                  signal:
                    controller.signal,
                }
              );

            const data =
              (await response
                .json()
                .catch(
                  () => ({})
                )) as CepLookupResponse;

            if (!response.ok) {
              throw new Error(
                data.error ||
                  "Não foi possível consultar o CEP."
              );
            }

            const address =
              data.address;

            if (
              !address ||
              typeof address.city !==
                "string" ||
              typeof address.state !==
                "string"
            ) {
              throw new Error(
                "O CEP não retornou um endereço válido."
              );
            }

            lastLookedUpCepRef.current =
              cep;

            setForm((current) => {
              if (
                normalizeCep(
                  current.cep
                ) !== cep
              ) {
                return current;
              }

              return {
                ...current,
                street:
                  address.street ??
                  "",
                neighborhood:
                  address.neighborhood ??
                  "",
                city:
                  address.city ??
                  "",
                state:
                  address.state ??
                  "",
              };
            });
          } catch (error) {
            if (
              error instanceof
                DOMException &&
              error.name ===
                "AbortError"
            ) {
              return;
            }

            setCepError(
              error instanceof Error
                ? error.message
                : "Não foi possível consultar o CEP."
            );
          } finally {
            if (
              !controller.signal
                .aborted
            ) {
              setCepLoading(false);
            }
          }
        },
        450
      );

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [form.cep, orderId]);

  /*
   * O resumo local é apenas visual.
   * O servidor recalcula todos os valores.
   */
  const localSubtotal =
    useMemo(() => {
      return cartItems.reduce(
        (
          currentTotal,
          item
        ) =>
          currentTotal +
          item.price *
            item.quantity,
        0
      );
    }, [cartItems]);

  const localShipping =
    selectedShipping
      ?.customerPrice ??
    0;

  const localTotal =
    localSubtotal +
    localShipping;

  function updateForm(
    field: keyof CheckoutForm,
    value: string
  ) {
    if (orderId) {
      return;
    }

    const addressFields: Array<keyof CheckoutForm> = [
      "cep",
      "street",
      "number",
      "complement",
      "neighborhood",
      "city",
      "state",
    ];

    if (
      customerAuthenticated &&
      !usingNewAddress &&
      addressFields.includes(field)
    ) {
      setSelectedAddressId(null);
      setUsingNewAddress(true);
    }

    const nextValue =
      field === "cep"
        ? formatCep(value)
        : value;

    setForm((current) => {
      if (
        field === "cep" &&
        normalizeCep(
          current.cep
        ) !==
          normalizeCep(nextValue)
      ) {
        return {
          ...current,
          cep: nextValue,
          street: "",
          neighborhood: "",
          city: "",
          state: "",
        };
      }

      return {
        ...current,
        [field]: nextValue,
      };
    });

    if (field === "cep") {
      setCepError("");
      setCepLoading(false);

      lastLookedUpCepRef.current =
        "";
    }

    if (
      field === "cep" &&
      selectedShipping &&
      normalizeCep(nextValue) !==
        selectedShipping.destinationCep
    ) {
      setSelectedShipping(null);
      setShippingOptions([]);
      setShippingError("");
      setShippingQuoteExpiresAt(
        null
      );

      window.sessionStorage.removeItem(
        "laico-shipping-selection"
      );
    }

    if (errorMessage) {
      setErrorMessage("");
    }
  }

  function clearShippingSelection() {
    setSelectedShipping(null);
    setShippingOptions([]);
    setShippingError("");
    setShippingQuoteExpiresAt(null);

    window.sessionStorage.removeItem(
      "laico-shipping-selection"
    );
  }

  function selectSavedAddress(
    address: SavedAddress
  ) {
    if (orderId) {
      return;
    }

    const cepChanged =
      normalizeCep(form.cep) !==
      normalizeCep(address.cep);

    setSelectedAddressId(address.id);
    setUsingNewAddress(false);
    setCepError("");

    lastLookedUpCepRef.current =
      normalizeCep(address.cep);

    setForm((current) => ({
      ...current,
      cep: formatCep(address.cep),
      street: address.street,
      number: address.number,
      complement: address.complement ?? "",
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
    }));

    if (cepChanged) {
      clearShippingSelection();
    }

    if (errorMessage) {
      setErrorMessage("");
    }
  }

  function startNewAddress() {
    if (orderId) {
      return;
    }

    setSelectedAddressId(null);
    setUsingNewAddress(true);
    setCepError("");

    lastLookedUpCepRef.current = "";

    setForm((current) => ({
      ...current,
      cep: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "",
    }));

    clearShippingSelection();
  }

  async function saveNewAddressIfNecessary() {
    if (
      !customerAuthenticated ||
      !usingNewAddress
    ) {
      return;
    }

    const normalizedAddress = {
      cep: normalizeCep(form.cep),
      state: form.state.trim().toUpperCase(),
      city: form.city.trim().toLowerCase(),
      neighborhood: form.neighborhood.trim().toLowerCase(),
      street: form.street.trim().toLowerCase(),
      number: form.number.trim().toLowerCase(),
      complement: form.complement.trim().toLowerCase(),
    };

    const existingAddress = savedAddresses.find(
      (address) =>
        normalizeCep(address.cep) === normalizedAddress.cep &&
        address.state.trim().toUpperCase() === normalizedAddress.state &&
        address.city.trim().toLowerCase() === normalizedAddress.city &&
        address.neighborhood.trim().toLowerCase() === normalizedAddress.neighborhood &&
        address.street.trim().toLowerCase() === normalizedAddress.street &&
        address.number.trim().toLowerCase() === normalizedAddress.number &&
        (address.complement ?? "").trim().toLowerCase() ===
          normalizedAddress.complement
    );

    if (existingAddress) {
      setSelectedAddressId(existingAddress.id);
      setUsingNewAddress(false);
      return;
    }

    const response = await fetch(
      "/api/account/addresses",
      {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name:
            savedAddresses.length === 0
              ? "Endereço principal"
              : `Endereço ${savedAddresses.length + 1}`,
          cep: normalizedAddress.cep,
          state: normalizedAddress.state,
          city: form.city.trim(),
          neighborhood: form.neighborhood.trim(),
          street: form.street.trim(),
          number: form.number.trim(),
          complement: form.complement.trim(),
          isDefault: savedAddresses.length === 0,
        }),
      }
    );

    const data = (await response.json().catch(
      () => ({})
    )) as AddressCreateResponse;

    if (!response.ok || !data.success || !data.address) {
      throw new Error(
        data.error || "Não foi possível salvar o novo endereço."
      );
    }

    setSavedAddresses((current) => [
      ...current,
      data.address as SavedAddress,
    ]);
    setSelectedAddressId(data.address.id);
    setUsingNewAddress(false);
  }

  async function calculateShipping() {
    if (
      shippingLoading ||
      orderId
    ) {
      return;
    }

    const destinationCep =
      normalizeCep(form.cep);

    if (
      destinationCep.length !== 8
    ) {
      setShippingError(
        "Informe um CEP válido."
      );

      return;
    }

    if (
      cartItems.length === 0
    ) {
      setShippingError(
        "Nenhum produto foi encontrado para calcular a entrega."
      );

      return;
    }

    setShippingLoading(true);
    setShippingError("");
    setShippingOptions([]);
    setSelectedShipping(null);
    setShippingQuoteExpiresAt(
      null
    );

    window.sessionStorage.removeItem(
      "laico-shipping-selection"
    );

    try {
      const response =
        await fetch(
          "/api/shipping/quote",
          {
            method: "POST",

            credentials:
              "same-origin",

            cache: "no-store",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              destinationCep,

              items:
                cartItems.map(
                  (item) => ({
                    productId:
                      item.id,

                    quantity:
                      item.quantity,
                  })
                ),
            }),
          }
        );

      const data =
        (await response
          .json()
          .catch(
            () => ({})
          )) as ShippingQuoteResponse;

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Não foi possível calcular a entrega."
        );
      }

      const validOptions =
        Array.isArray(
          data.quote?.options
        )
          ? data.quote.options.filter(
              isShippingOption
            )
          : [];

      if (
        validOptions.length === 0
      ) {
        throw new Error(
          "Nenhuma modalidade de entrega está disponível para este CEP."
        );
      }

      setShippingOptions(
        validOptions
      );

      setShippingQuoteExpiresAt(
        typeof data.quote
          ?.expiresAt ===
          "string"
          ? data.quote.expiresAt
          : null
      );
    } catch (error) {
      setShippingError(
        error instanceof Error
          ? error.message
          : "Não foi possível calcular a entrega."
      );
    } finally {
      setShippingLoading(false);
    }
  }

  function selectShipping(
    option: ShippingOption
  ) {
    if (orderId) {
      return;
    }

    const destinationCep =
      normalizeCep(form.cep);

    if (
      destinationCep.length !== 8
    ) {
      setShippingError(
        "Informe um CEP válido."
      );

      return;
    }

    const selection:
      StoredShippingSelection = {
      ...option,
      destinationCep,
      expiresAt:
        shippingQuoteExpiresAt ??
        undefined,
    };

    setSelectedShipping(
      selection
    );

    setShippingError("");

    window.sessionStorage.setItem(
      "laico-shipping-selection",
      JSON.stringify(selection)
    );
  }

  function validateForm(): string | null {
    if (
      cartItems.length === 0
    ) {
      return "Nenhum produto foi encontrado no checkout.";
    }

    if (
      !form.name.trim() ||
      !form.cpf.trim() ||
      !form.email.trim() ||
      !form.phone.trim() ||
      !form.cep.trim() ||
      !form.street.trim() ||
      !form.number.trim() ||
      !form.neighborhood.trim() ||
      !form.city.trim() ||
      !form.state.trim()
    ) {
      return "Preencha todos os campos obrigatórios.";
    }

    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        form.email.trim()
      )
    ) {
      return "Informe um e-mail válido.";
    }

    if (
      normalizeCep(
        form.cep
      ).length !== 8
    ) {
      return "Informe um CEP válido.";
    }

    if (
      !selectedShipping ||
      selectedShipping.destinationCep !==
        normalizeCep(form.cep)
    ) {
      return "Calcule e selecione uma modalidade de entrega.";
    }

    return null;
  }

  async function handleCreateOrder() {
    if (
      creatingOrderRef.current ||
      loading ||
      orderId
    ) {
      return;
    }

    const validationError =
      validateForm();

    if (validationError) {
      setErrorMessage(
        validationError
      );

      return;
    }

    creatingOrderRef.current =
      true;

    setLoading(true);
    setErrorMessage("");

    let orderCreated = false;

    try {
      await saveNewAddressIfNecessary();

      const checkoutResponse =
        await fetch(
          "/api/checkout",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            credentials:
              "same-origin",

            cache: "no-store",

            body: JSON.stringify({
              customer: {
                name:
                  form.name.trim(),

                email:
                  form.email
                    .trim()
                    .toLowerCase(),

                phone:
                  form.phone,

                cpf:
                  form.cpf,
              },

              address: {
                cep:
                  form.cep,

                state:
                  form.state,

                city:
                  form.city.trim(),

                neighborhood:
                  form.neighborhood.trim(),

                street:
                  form.street.trim(),

                number:
                  form.number.trim(),

                complement:
                  form.complement.trim(),
              },

              items:
                cartItems.map(
                  (item) => ({
                    id:
                      item.id,

                    slug:
                      item.slug,

                    quantity:
                      item.quantity,
                  })
                ),

              shipping: {
                serviceId:
                  selectedShipping
                    ?.serviceId,
              },
            }),
          }
        );

      const checkoutData =
        (await checkoutResponse
          .json()
          .catch(
            () => ({})
          )) as CheckoutResponse;

      if (
        !checkoutResponse.ok
      ) {
        throw new Error(
          checkoutData.error ||
            "Não foi possível criar o pedido."
        );
      }

      const createdOrderId =
        checkoutData.orderId;

      const serverTotal =
        Number(
          checkoutData.order
            ?.total
        );

      if (
        !createdOrderId ||
        typeof createdOrderId !==
          "string"
      ) {
        throw new Error(
          "O servidor não retornou o pedido criado."
        );
      }

      if (
        !Number.isFinite(
          serverTotal
        ) ||
        serverTotal <= 0
      ) {
        throw new Error(
          "O servidor retornou um valor de pedido inválido."
        );
      }

      orderCreated = true;

      setOrderId(
        createdOrderId
      );

      /*
       * O Payment Brick recebe o total que
       * veio do servidor, não o localStorage.
       */
      setOrderAmount(
        serverTotal
      );

      setOrderExpiresAt(
        checkoutData.order
          ?.expiresAt ||
          null
      );
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Erro ao preparar o pagamento."
      );
    } finally {
      setLoading(false);

      /*
       * Se o pedido foi criado, o bloqueio
       * permanece para evitar outro pedido.
       */
      if (!orderCreated) {
        creatingOrderRef.current =
          false;
      }
    }
  }

  const paymentOptions: {
    id: PaymentMethod;
    title: string;
    text: string;
    image: string;
  }[] = [
    {
      id: "pix",
      title: "PIX",
      text:
        "QR Code e copia e cola",
      image:
        cardFlags.pix,
    },
    {
      id: "credit_card",
      title: "Crédito",
      text:
        "Cartão de crédito",
      image:
        cardFlags.visa,
    },
    {
      id: "debit_card",
      title: "Débito",
      text:
        "Cartão de débito",
      image:
        cardFlags.master,
    },
    {
      id: "ticket",
      title: "Boleto",
      text:
        "Boleto bancário",
      image:
        cardFlags.boleto,
    },
  ];

  return (
    <main className="min-h-screen bg-[#faf9f6]">
      <Header />

      <section className="mx-auto max-w-[1370px] px-6 py-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <section className="rounded-[8px] border border-[#e8dcc2] bg-white p-6">
                <div className="mb-6 flex items-center gap-3">
                  <User
                    className="text-[#b98218]"
                    aria-hidden="true"
                  />

                  <div>
                    <h2 className="text-[20px] font-bold">
                      1. Identificação
                    </h2>

                    <p className="text-[13px] text-neutral-500">
                      Informe seus dados
                      pessoais
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="block">
                    <span className="text-[13px] font-semibold">
                      Nome completo *
                    </span>

                    <input
                      value={
                        form.name
                      }
                      onChange={(
                        event
                      ) =>
                        updateForm(
                          "name",
                          event.target
                            .value
                        )
                      }
                      name="name"
                      type="text"
                      autoComplete="name"
                      disabled={
                        Boolean(
                          orderId
                        )
                      }
                      placeholder="Digite seu nome completo"
                      className={
                        inputClassName
                      }
                    />

                  </label>

                  <label className="block">
                    <span className="text-[13px] font-semibold">
                      CPF *
                    </span>

                    <input
                      value={
                        form.cpf
                      }
                      onChange={(
                        event
                      ) =>
                        updateForm(
                          "cpf",
                          event.target
                            .value
                        )
                      }
                      name="cpf"
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      disabled={
                        Boolean(
                          orderId
                        )
                      }
                      placeholder="000.000.000-00"
                      className={
                        inputClassName
                      }
                    />
                  </label>

                  <label className="block">
                    <span className="text-[13px] font-semibold">
                      E-mail *
                    </span>

                    <input
                      value={
                        form.email
                      }
                      onChange={(
                        event
                      ) =>
                        updateForm(
                          "email",
                          event.target
                            .value
                        )
                      }
                      name="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      autoCapitalize="none"
                      spellCheck={false}
                      disabled={
                        Boolean(
                          orderId
                        )
                      }
                      placeholder="seu@email.com"
                      className={
                        inputClassName
                      }
                    />
                  </label>

                  <label className="block">
                    <span className="text-[13px] font-semibold">
                      Telefone / WhatsApp *
                    </span>

                    <input
                      value={
                        form.phone
                      }
                      onChange={(
                        event
                      ) =>
                        updateForm(
                          "phone",
                          event.target
                            .value
                        )
                      }
                      name="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      disabled={
                        Boolean(
                          orderId
                        )
                      }
                      placeholder="(11) 99999-9999"
                      className={
                        inputClassName
                      }
                    />
                  </label>
                </div>
              </section>

              <section className="rounded-[8px] border border-[#e8dcc2] bg-white p-6">
                <div className="mb-6 flex items-center gap-3">
                  <MapPin
                    className="text-[#b98218]"
                    aria-hidden="true"
                  />

                  <div>
                    <h2 className="text-[20px] font-bold">
                      2. Entrega
                    </h2>

                    <p className="text-[13px] text-neutral-500">
                      {customerAuthenticated
                        ? "Escolha um endereço salvo ou cadastre outro"
                        : "Informe o endereço de entrega"}
                    </p>
                  </div>
                </div>

                {addressesLoading && (
                  <div className="mb-5 flex items-center gap-2 rounded-[8px] border border-[#e8dcc2] bg-[#faf9f6] px-4 py-3 text-[13px] text-neutral-600">
                    <LoaderCircle
                      size={16}
                      className="animate-spin text-[#b98218]"
                      aria-hidden="true"
                    />
                    Carregando seus endereços...
                  </div>
                )}

                {!addressesLoading &&
                  customerAuthenticated &&
                  savedAddresses.length > 0 && (
                    <fieldset className="mb-5 space-y-3">
                      <legend className="mb-2 text-[13px] font-bold text-[#20170f]">
                        Endereços cadastrados
                      </legend>

                      {savedAddresses.map((address) => {
                        const selected =
                          !usingNewAddress &&
                          selectedAddressId === address.id;

                        return (
                          <button
                            key={address.id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            disabled={Boolean(orderId)}
                            onClick={() => selectSavedAddress(address)}
                            className={`flex w-full items-start gap-3 rounded-[8px] border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              selected
                                ? "border-[#b98218] bg-[#fff9eb] ring-1 ring-[#b98218]"
                                : "border-[#e8dcc2] bg-white hover:border-[#d2b36f]"
                            }`}
                          >
                            <span
                              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                selected
                                  ? "border-[#b98218] bg-[#b98218] text-white"
                                  : "border-[#b8aa96] bg-white"
                              }`}
                              aria-hidden="true"
                            >
                              {selected && <Check size={13} strokeWidth={3} />}
                            </span>

                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-center gap-2">
                                <strong className="text-[13px] text-[#20170f]">
                                  {address.name}
                                </strong>

                                {address.isDefault && (
                                  <span className="rounded-full bg-[#efe2c2] px-2 py-0.5 text-[10px] font-bold text-[#9f6f14]">
                                    Principal
                                  </span>
                                )}
                              </span>

                              <span className="mt-1 block text-[12px] leading-5 text-neutral-600">
                                {address.street}, {address.number}
                                {address.complement
                                  ? `, ${address.complement}`
                                  : ""}
                                <br />
                                {address.neighborhood} — {address.city}/{address.state}
                                <br />
                                CEP {formatCep(address.cep)}
                              </span>
                            </span>
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        role="radio"
                        aria-checked={usingNewAddress}
                        disabled={Boolean(orderId)}
                        onClick={startNewAddress}
                        className={`flex w-full items-center gap-3 rounded-[8px] border p-4 text-left text-[13px] font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                          usingNewAddress
                            ? "border-[#b98218] bg-[#fff9eb] text-[#9f6f14] ring-1 ring-[#b98218]"
                            : "border-dashed border-[#d2b36f] bg-white text-[#b98218] hover:bg-[#fffaf0]"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                            usingNewAddress
                              ? "border-[#b98218] bg-[#b98218] text-white"
                              : "border-[#b8aa96] bg-white"
                          }`}
                          aria-hidden="true"
                        >
                          {usingNewAddress && <Check size={13} strokeWidth={3} />}
                        </span>
                        Usar e salvar outro endereço
                      </button>
                    </fieldset>
                  )}

                {!addressesLoading &&
                  customerAuthenticated &&
                  savedAddresses.length === 0 && (
                    <div className="mb-5 rounded-[8px] border border-[#e8dcc2] bg-[#faf9f6] px-4 py-3 text-[12px] leading-5 text-neutral-600">
                      Você ainda não possui endereço cadastrado. O endereço
                      informado nesta compra será salvo em sua conta.
                    </div>
                  )}

                {addressesError && (
                  <div
                    role="alert"
                    className="mb-5 rounded-[8px] border border-amber-200 bg-amber-50 px-4 py-3 text-[12px] leading-5 text-amber-800"
                  >
                    {addressesError} Você ainda pode finalizar como convidado.
                  </div>
                )}

                <div className="space-y-4">
                  <label className="block">
                    <span className="text-[13px] font-semibold">
                      CEP *
                    </span>

                    <input
                      value={
                        form.cep
                      }
                      onChange={(
                        event
                      ) =>
                        updateForm(
                          "cep",
                          event.target
                            .value
                        )
                      }
                      name="postalCode"
                      type="text"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      disabled={
                        Boolean(
                          orderId
                        )
                      }
                      placeholder="00000-000"
                      className={
                        inputClassName
                      }
                    />

                    {cepLoading && (
                      <span className="mt-2 flex items-center gap-2 text-[12px] text-[#b98218]">
                        <LoaderCircle
                          size={14}
                          className="animate-spin"
                          aria-hidden="true"
                        />

                        Buscando endereço...
                      </span>
                    )}

                    {cepError && (
                      <span
                        role="alert"
                        className="mt-2 block text-[12px] leading-5 text-red-600"
                      >
                        {cepError}
                      </span>
                    )}
                  </label>

                  <label className="block">
                    <span className="text-[13px] font-semibold">
                      Rua *
                    </span>

                    <input
                      value={
                        form.street
                      }
                      onChange={(
                        event
                      ) =>
                        updateForm(
                          "street",
                          event.target
                            .value
                        )
                      }
                      name="street"
                      type="text"
                      autoComplete="address-line1"
                      disabled={
                        Boolean(
                          orderId
                        )
                      }
                      placeholder="Digite sua rua"
                      className={
                        inputClassName
                      }
                    />
                  </label>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label>
                      <span className="text-[13px] font-semibold">
                        Número *
                      </span>

                      <input
                        value={
                          form.number
                        }
                        onChange={(
                          event
                        ) =>
                          updateForm(
                            "number",
                            event.target
                              .value
                          )
                        }
                        name="addressNumber"
                        type="text"
                        autoComplete="address-line2"
                        disabled={
                          Boolean(
                            orderId
                          )
                        }
                        placeholder="123"
                        className={
                          inputClassName
                        }
                      />
                    </label>

                    <label>
                      <span className="text-[13px] font-semibold">
                        Complemento
                      </span>

                      <input
                        value={
                          form.complement
                        }
                        onChange={(
                          event
                        ) =>
                          updateForm(
                            "complement",
                            event.target
                              .value
                          )
                        }
                        name="complement"
                        type="text"
                        disabled={
                          Boolean(
                            orderId
                          )
                        }
                        placeholder="Apto, bloco, etc."
                        className={
                          inputClassName
                        }
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label>
                      <span className="text-[13px] font-semibold">
                        Bairro *
                      </span>

                      <input
                        value={
                          form.neighborhood
                        }
                        onChange={(
                          event
                        ) =>
                          updateForm(
                            "neighborhood",
                            event.target
                              .value
                          )
                        }
                        name="neighborhood"
                        type="text"
                        disabled={
                          Boolean(
                            orderId
                          )
                        }
                        placeholder="Digite seu bairro"
                        className={
                          inputClassName
                        }
                      />
                    </label>

                    <label>
                      <span className="text-[13px] font-semibold">
                        Cidade *
                      </span>

                      <input
                        value={
                          form.city
                        }
                        onChange={(
                          event
                        ) =>
                          updateForm(
                            "city",
                            event.target
                              .value
                          )
                        }
                        name="city"
                        type="text"
                        autoComplete="address-level2"
                        disabled={
                          Boolean(
                            orderId
                          )
                        }
                        placeholder="Digite sua cidade"
                        className={
                          inputClassName
                        }
                      />
                    </label>
                  </div>

                  <label className="block">
                    <span className="text-[13px] font-semibold">
                      Estado *
                    </span>

                    <select
                      value={
                        form.state
                      }
                      onChange={(
                        event
                      ) =>
                        updateForm(
                          "state",
                          event.target
                            .value
                        )
                      }
                      name="state"
                      autoComplete="address-level1"
                      disabled={
                        Boolean(
                          orderId
                        )
                      }
                      className={
                        inputClassName
                      }
                    >
                      <option value="">
                        Selecione
                      </option>

                      {brazilianStates.map(
                        (state) => (
                          <option
                            key={
                              state
                            }
                            value={
                              state
                            }
                          >
                            {state}
                          </option>
                        )
                      )}
                    </select>
                  </label>
                </div>

                <div className="mt-5 rounded-[8px] border border-[#ead9b8] bg-[#fffdf8] p-4">
                  <div className="flex items-start gap-3">
                    <Truck
                      className="mt-0.5 shrink-0 text-[#b98218]"
                      aria-hidden="true"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-bold">
                        Modalidade de entrega
                      </p>

                      <p className="mt-1 text-[12px] leading-5 text-neutral-500">
                        Calcule o frete e escolha uma opção antes de continuar.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={
                      calculateShipping
                    }
                    disabled={
                      shippingLoading ||
                      Boolean(orderId) ||
                      normalizeCep(
                        form.cep
                      ).length !== 8 ||
                      cartItems.length ===
                        0
                    }
                    className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-[6px] bg-[#20170f] px-4 text-[13px] font-bold text-white transition hover:bg-[#38291d] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {shippingLoading ? (
                      <LoaderCircle
                        size={17}
                        className="animate-spin"
                        aria-hidden="true"
                      />
                    ) : (
                      <Truck
                        size={17}
                        aria-hidden="true"
                      />
                    )}

                    {shippingLoading
                      ? "Calculando..."
                      : shippingOptions.length >
                          0
                        ? "Calcular novamente"
                        : "Calcular entrega"}
                  </button>

                  {shippingError && (
                    <div
                      role="alert"
                      className="mt-3 rounded-[6px] border border-red-200 bg-red-50 px-3 py-2 text-[12px] leading-5 text-red-700"
                    >
                      {shippingError}
                    </div>
                  )}

                  {shippingOptions.length >
                    0 && (
                    <div className="mt-4 space-y-2">
                      {shippingOptions.map(
                        (option) => {
                          const selected =
                            selectedShipping
                              ?.serviceId ===
                            option.serviceId;

                          return (
                            <button
                              type="button"
                              key={
                                option.serviceId
                              }
                              onClick={() =>
                                selectShipping(
                                  option
                                )
                              }
                              disabled={
                                Boolean(
                                  orderId
                                )
                              }
                              className={`flex w-full items-center gap-3 rounded-[7px] border p-3 text-left transition disabled:cursor-not-allowed ${
                                selected
                                  ? "border-[#b98218] bg-[#fff8e8] ring-2 ring-[#b98218]/10"
                                  : "border-[#e8dcc2] bg-white hover:border-[#b98218]"
                              }`}
                            >
                              <span
                                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                                  selected
                                    ? "border-[#b98218] bg-[#b98218] text-white"
                                    : "border-neutral-300 bg-white text-transparent"
                                }`}
                              >
                                <CheckCircle2
                                  size={14}
                                  aria-hidden="true"
                                />
                              </span>

                              <span className="min-w-0 flex-1">
                                <strong className="block truncate text-[13px] text-[#20170f]">
                                  {
                                    option.companyName
                                  }{" "}
                                  -{" "}
                                  {
                                    option.serviceName
                                  }
                                </strong>

                                <span className="mt-0.5 block text-[11px] text-neutral-500">
                                  {option.deliveryRange.minimum ===
                                  option.deliveryRange.maximum
                                    ? `${option.deliveryRange.maximum} dia(s) útil(eis)`
                                    : `${option.deliveryRange.minimum} a ${option.deliveryRange.maximum} dias úteis`}
                                </span>
                              </span>

                              <strong className="shrink-0 text-[13px] text-[#b98218]">
                                {option.customerPrice ===
                                0
                                  ? "Grátis"
                                  : formatPrice(
                                      option.customerPrice
                                    )}
                              </strong>
                            </button>
                          );
                        }
                      )}
                    </div>
                  )}
                </div>
              </section>
            </div>

            <section className="rounded-[8px] border border-[#e8dcc2] bg-white p-6">
              <div className="mb-6 flex items-center gap-3">
                <CreditCard
                  className="text-[#b98218]"
                  aria-hidden="true"
                />

                <div>
                  <h2 className="text-[20px] font-bold">
                    3. Pagamento
                  </h2>

                  <p className="text-[13px] text-neutral-500">
                    Escolha Pix, boleto,
                    crédito ou débito no
                    próprio site.
                  </p>
                </div>
              </div>

              {errorMessage && (
                <div
                  role="alert"
                  aria-live="polite"
                  className="mb-5 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700"
                >
                  {errorMessage}
                </div>
              )}

              {!orderId ? (
                <>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                    {paymentOptions.map(
                      (payment) => (
                        <button
                          type="button"
                          key={
                            payment.id
                          }
                          onClick={() =>
                            setSelectedPayment(
                              payment.id
                            )
                          }
                          disabled={
                            loading
                          }
                          className={`h-[100px] rounded-[6px] border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60 ${
                            selectedPayment ===
                            payment.id
                              ? "border-[#b98218] bg-[#fff8e8] shadow"
                              : "border-[#e5e5e5] bg-white hover:border-[#b98218]"
                          }`}
                        >
                          <img
                            src={
                              payment.image
                            }
                            alt={
                              payment.title
                            }
                            className="mb-3 h-[28px] object-contain"
                          />

                          <p className="text-[14px] font-bold">
                            {
                              payment.title
                            }
                          </p>

                          <p className="text-[11px] text-neutral-500">
                            {
                              payment.text
                            }
                          </p>
                        </button>
                      )
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={
                      handleCreateOrder
                    }
                    disabled={
                      loading ||
                      cartItems.length ===
                        0 ||
                      !selectedShipping
                    }
                    className="mt-6 flex h-[52px] w-full items-center justify-center gap-2 rounded-[5px] bg-gradient-to-r from-[#b8872b] via-[#d8b35a] to-[#b98218] font-bold text-white shadow-lg disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <Lock
                      size={18}
                      aria-hidden="true"
                    />

                    {loading
                      ? "Preparando pagamento..."
                      : selectedPayment ===
                          "pix"
                        ? "Gerar Pix"
                        : selectedPayment ===
                            "ticket"
                          ? "Gerar boleto"
                          : "Continuar pagamento"}
                  </button>
                </>
              ) : (
                <div className="rounded-[8px] border border-[#ead9b8] bg-white p-4">
                  {orderExpiresAt && (
                    <div className="mb-4 rounded-[8px] border border-[#ead9b8] bg-[#fff8e8] p-4 text-[13px] text-[#20170f]">
                      <strong>
                        Prazo para pagamento:
                      </strong>{" "}
                      {formatDateTime(
                        orderExpiresAt
                      )}
                    </div>
                  )}

                  {orderAmount &&
                  orderAmount > 0 ? (
                    <MercadoPagoPaymentBrick
                      orderId={
                        orderId
                      }
                      amount={
                        orderAmount
                      }
                      email={form.email
                        .trim()
                        .toLowerCase()}
                      selectedPayment={
                        selectedPayment
                      }
                    />
                  ) : (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      Não foi possível
                      carregar o valor do
                      pedido.
                    </div>
                  )}
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-6">
            <section className="overflow-hidden rounded-[8px] border border-[#e8dcc2] bg-white">
              <div className="flex items-center gap-3 border-b border-[#e8dcc2] p-6">
                <ShoppingBag
                  aria-hidden="true"
                />

                <h2 className="text-[20px] font-bold">
                  Resumo do pedido
                </h2>
              </div>

              <div className="p-6">
                {cartItems.length ===
                0 ? (
                  <p className="text-[14px] text-neutral-500">
                    Nenhum produto
                    selecionado.
                  </p>
                ) : (
                  <div className="space-y-5">
                    {cartItems.map(
                      (item) => (
                        <div
                          key={
                            item.id
                          }
                          className="flex gap-4"
                        >
                          <div className="flex h-[70px] w-[70px] shrink-0 items-center justify-center rounded-[6px] border border-[#e8dcc2] bg-[#fffdf8]">
                            <img
                              src={
                                item.image
                              }
                              alt={
                                item.name
                              }
                              className="max-h-[58px] max-w-[58px] object-contain"
                            />
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="text-[14px] font-bold">
                              {
                                item.name
                              }
                            </p>

                            <p className="text-[12px] text-neutral-500">
                              Qtd:{" "}
                              {
                                item.quantity
                              }
                            </p>
                          </div>

                          <strong className="shrink-0 text-[14px]">
                            {formatPrice(
                              item.price *
                                item.quantity
                            )}
                          </strong>
                        </div>
                      )
                    )}
                  </div>
                )}

                <div className="mt-5 space-y-4 border-t border-[#e8dcc2] pt-5 text-[14px]">
                  <div className="flex justify-between">
                    <span>
                      Subtotal
                    </span>

                    <strong>
                      {formatPrice(
                        localSubtotal
                      )}
                    </strong>
                  </div>

                  <div className="flex justify-between">
                    <div>
                      <span className="block">
                        Frete
                      </span>

                      {selectedShipping && (
                        <span className="mt-0.5 block max-w-[210px] text-[11px] text-neutral-500">
                          {
                            selectedShipping.companyName
                          }{" "}
                          -{" "}
                          {
                            selectedShipping.serviceName
                          }
                        </span>
                      )}
                    </div>

                    <strong className="shrink-0">
                      {selectedShipping
                        ? localShipping ===
                          0
                          ? "Grátis"
                          : formatPrice(
                              localShipping
                            )
                        : "A calcular"}
                    </strong>
                  </div>

                  <div className="flex justify-between pt-3 text-[18px]">
                    <strong>
                      Total
                    </strong>

                    <strong className="text-[#b98218]">
                      {formatPrice(
                        orderAmount ??
                          localTotal
                      )}
                    </strong>
                  </div>
                </div>
              </div>
            </section>

            <p className="flex items-center justify-center gap-2 text-[13px] text-neutral-600">
              <ShieldCheck
                size={17}
                aria-hidden="true"
              />

              Pagamento processado com
              segurança pelo Mercado Pago
            </p>
          </aside>
        </div>
      </section>

      <Footer />

      <button
        type="button"
        aria-label="Falar pelo WhatsApp"
        className="fixed bottom-8 right-8 flex h-[62px] w-[62px] items-center justify-center rounded-full bg-[#24c45a] text-white shadow-2xl"
      >
        <MessageCircle
          size={34}
          aria-hidden="true"
        />
      </button>
    </main>
  );
}