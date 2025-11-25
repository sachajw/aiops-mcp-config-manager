# VERIFICATION PROTOCOL FOR MCP CONFIGURATION MANAGER
*Effective Immediately - All Team Members Must Follow*

## 🛑 STOP: Current Process is Broken

We have multiple bugs marked "FIXED" that are still broken. This protocol prevents false fixes.

## ✅ THE NEW RULE: Definition of "FIXED"

A bug is ONLY fixed when:
1. **Developer** provides console evidence
2. **QA** confirms it works in UI
3. **Screenshot** proof exists
4. **ACTIVE_BUGS_AUDIT.md** is updated
5. **Then and only then** tasks.md is updated

## 📝 DEVELOPER WORKFLOW

```mermaid
Developer Fix Process:
1. Read bug from ACTIVE_BUGS_AUDIT.md
2. Add console.log statements to track fix
3. Implement solution
4. Run app and capture console output
5. Test the specific feature
6. Post console evidence to Context Manager
7. WAIT for QA verification
8. Do NOT mark as fixed yet
```

### Required Console Evidence:
```javascript
console.log('[BugFix-001] Before fix:', oldValue);
console.log('[BugFix-001] After fix:', newValue);
console.log('[BugFix-001] Verification:', actualResult);
```

## 🔍 QA WORKFLOW

```mermaid
QA Verification Process:
1. Receive fix notification from Developer
2. Pull latest code
3. Run application
4. Test EXACT bug scenario
5. Take screenshot of working feature
6. Update ACTIVE_BUGS_AUDIT.md with verification
7. Notify Context Manager of result
8. Only if verified → Update tasks.md
```

### Required Evidence:
- Screenshot showing feature working
- Test steps followed
- Timestamp of verification
- Any edge cases tested

## 🚫 WHAT NOT TO DO

1. **DON'T** mark anything "FIXED" without verification
2. **DON'T** work on multiple bugs simultaneously
3. **DON'T** update tasks.md before ACTIVE_BUGS_AUDIT.md
4. **DON'T** assume a fix works without testing
5. **DON'T** skip console logging

## 📊 TRACKING TEMPLATE

Use this in every communication:

```
BUG STATUS UPDATE
Bug ID: Bug-XXX
Status: [In Progress / Ready for QA / Verified / Failed]
Developer Evidence: [Console output or "pending"]
QA Evidence: [Screenshot or "pending"]
Next Step: [Specific action needed]
```

## 🔄 CONTEXT MANAGEMENT

### When to `/clear`:
- After completing a bug (verified fixed OR abandoned)
- When switching between major features
- If context becomes confused/contradictory
- Before starting fresh on stuck bugs

### What to load after `/clear`:
1. `ACTIVE_BUGS_AUDIT.md`
2. `.kiro/steering/product.md`
3. Specific files for the ONE bug being worked on

## 📈 SUCCESS METRICS

Track in ACTIVE_BUGS_AUDIT.md:
- False Fix Rate (must be 0%)
- Verification Time (target < 30 min)
- First-Time Fix Rate (target > 80%)
- Context Resets Required (fewer is better)

## 🚨 ESCALATION

If a bug fails verification 2+ times:
1. STOP all work
2. Both Developer and QA `/clear`
3. Start fresh with pair debugging
4. Document root cause analysis
5. Update this protocol if process issue found

## 💡 EXAMPLE: Bug-001 (Performance Insights)

### ❌ OLD WAY (Failed):
- Dev: "Fixed it" → Update tasks.md → User reports still broken

### ✅ NEW WAY:
1. Dev: Implements fix with console logging
2. Dev: Posts console showing `[InsightsPanel] Setting new metrics: {totalTokens: 45000, ...}`
3. QA: Tests and sees real numbers in UI
4. QA: Screenshots showing "Tokens: 45,000" instead of "0"
5. QA: Updates ACTIVE_BUGS_AUDIT.md with verification
6. THEN: tasks.md updated to show Bug-001 FIXED

## 📋 DAILY STANDUP QUESTIONS

1. What bug am I working on? (ONE only)
2. What evidence do I have of progress?
3. What verification is still needed?
4. Any blockers requiring context reset?

---

**Remember**: It's better to have 1 verified fix than 10 false claims. Quality over quantity!