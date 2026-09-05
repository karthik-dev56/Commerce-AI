permit (
    principal == Agent::"ai-agent",
    action == Action::"CREATE_PAYMENT",
    resource == Cart::"current"
)
when {
    context.mandateActive == true &&
    context.cartMatchesMandate == true &&
    context.amountWithinLimit == true
};