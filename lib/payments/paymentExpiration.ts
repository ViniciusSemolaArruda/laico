export function getPaymentExpirationDate(paymentMethodId?: string | null) {
  const now = new Date();

  switch (paymentMethodId) {
    case "pix":
      return new Date(now.getTime() + 30 * 60 * 1000);

    case "bolbradesco":
    case "boleto":
    case "ticket":
      return new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

    case "debit_card":
      return new Date(now.getTime() + 15 * 60 * 1000);

    case "master":
    case "visa":
    case "amex":
    case "elo":
    case "hipercard":
      return new Date(now.getTime() + 2 * 60 * 60 * 1000);

    default:
      return new Date(now.getTime() + 30 * 60 * 1000);
  }
}