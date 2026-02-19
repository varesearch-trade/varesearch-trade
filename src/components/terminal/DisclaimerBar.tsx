export default function DisclaimerBar() {
  return (
    <div
      className="fixed bottom-0 left-0 w-full z-[100000] overflow-hidden whitespace-nowrap"
      style={{
        height: 'var(--disclaimer-h)',
        background: '#000',
        borderTop: '1px solid rgba(212,175,55,0.3)',
        color: 'var(--gold)',
        fontSize: '11px',
        fontWeight: 700,
        fontFamily: "'JetBrains Mono', monospace",
        textTransform: 'uppercase',
        display: 'flex',
        alignItems: 'center',
      }}
    >
      <span
        className="inline-block pl-[100%]"
        style={{ animation: 'marquee 60s linear infinite' }}
      >
        ⚠ DISCLAIMER: All content on this platform is for educational and informational purposes only. Technical studies and market analyses do not constitute financial advice, solicitation, or a recommendation to buy or sell any financial instrument. Capital market investments involve significant risk of loss. Perform your own due diligence or consult a certified financial advisor before making any investment decision. Past performance is not indicative of future results. &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ⚠ DISCLAIMER: All content on this platform is for educational and informational purposes only. Technical studies and market analyses do not constitute financial advice, solicitation, or a recommendation to buy or sell any financial instrument. Capital market investments involve significant risk of loss.
      </span>
    </div>
  )
}
