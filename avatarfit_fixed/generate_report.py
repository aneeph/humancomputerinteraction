from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether, PageBreak
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from datetime import date

OUTPUT = "AvatarFit_Project_Report.pdf"

# ── Colours ──────────────────────────────────────────────────────────────────
PINK   = colors.HexColor("#FF3D9A")
GOLD   = colors.HexColor("#FBBF24")
PURPLE = colors.HexColor("#A855F7")
GREEN  = colors.HexColor("#34D399")
RED    = colors.HexColor("#EF4444")
DARK   = colors.HexColor("#0F0D1E")
MID    = colors.HexColor("#1E1A2E")
LIGHT  = colors.HexColor("#E2E8F0")
GREY   = colors.HexColor("#94A3B8")
WHITE  = colors.white

# ── Styles ───────────────────────────────────────────────────────────────────
base = getSampleStyleSheet()

def S(name, **kw):
    return ParagraphStyle(name, **kw)

styles = {
    "cover_title": S("cover_title", fontSize=34, leading=40, textColor=WHITE,
                     fontName="Helvetica-Bold", alignment=TA_CENTER, spaceAfter=6),
    "cover_sub":   S("cover_sub",   fontSize=14, leading=18, textColor=GOLD,
                     fontName="Helvetica-Bold", alignment=TA_CENTER, spaceAfter=4),
    "cover_date":  S("cover_date",  fontSize=10, leading=14, textColor=GREY,
                     fontName="Helvetica", alignment=TA_CENTER),
    "h1":  S("h1",  fontSize=18, leading=24, textColor=PINK,
              fontName="Helvetica-Bold", spaceBefore=18, spaceAfter=6),
    "h2":  S("h2",  fontSize=13, leading=18, textColor=GOLD,
              fontName="Helvetica-Bold", spaceBefore=12, spaceAfter=4),
    "h3":  S("h3",  fontSize=11, leading=15, textColor=GREEN,
              fontName="Helvetica-Bold", spaceBefore=8, spaceAfter=3),
    "body": S("body", fontSize=9.5, leading=14, textColor=LIGHT,
               fontName="Helvetica", alignment=TA_JUSTIFY, spaceAfter=5),
    "bullet": S("bullet", fontSize=9.5, leading=14, textColor=LIGHT,
                 fontName="Helvetica", leftIndent=14, firstLineIndent=-10,
                 spaceAfter=3),
    "code":  S("code",  fontSize=8.5, leading=12, textColor=GREEN,
                fontName="Courier", leftIndent=12, spaceAfter=4,
                backColor=MID),
    "label": S("label", fontSize=8, leading=11, textColor=GREY,
                fontName="Helvetica-Bold", spaceAfter=2),
    "caption": S("caption", fontSize=8, leading=11, textColor=GREY,
                  fontName="Helvetica", alignment=TA_CENTER, spaceAfter=6),
    "tag_fix":  S("tag_fix",  fontSize=8, leading=11, textColor=GREEN,
                   fontName="Helvetica-Bold"),
    "tag_bug":  S("tag_bug",  fontSize=8, leading=11, textColor=RED,
                   fontName="Helvetica-Bold"),
    "tag_feat": S("tag_feat", fontSize=8, leading=11, textColor=GOLD,
                   fontName="Helvetica-Bold"),
}

def h(style, text):
    return Paragraph(text, styles[style])

def body(text):
    return Paragraph(text, styles["body"])

def bullet(text):
    return Paragraph(f"• {text}", styles["bullet"])

def code(text):
    return Paragraph(text, styles["code"])

def space(n=6):
    return Spacer(1, n)

def rule(color=PINK, thickness=1):
    return HRFlowable(width="100%", thickness=thickness, color=color, spaceAfter=6)

def tag_table(entries):
    """entries = list of (tag_style, tag_text, description)"""
    rows = []
    for ts, tt, desc in entries:
        rows.append([
            Paragraph(f"[{tt}]", styles[ts]),
            Paragraph(desc, styles["body"]),
        ])
    t = Table(rows, colWidths=[2.2*cm, None])
    t.setStyle(TableStyle([
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("LEFTPADDING",  (0,0), (-1,-1), 0),
        ("RIGHTPADDING", (0,0), (-1,-1), 0),
        ("BOTTOMPADDING",(0,0), (-1,-1), 4),
        ("TOPPADDING",   (0,0), (-1,-1), 0),
    ]))
    return t

def stat_table(rows, col_widths=None):
    col_widths = col_widths or [4.5*cm, None]
    data = [[Paragraph(f"<b>{k}</b>", styles["label"]),
             Paragraph(v, styles["body"])] for k, v in rows]
    t = Table(data, colWidths=col_widths)
    t.setStyle(TableStyle([
        ("VALIGN",       (0,0), (-1,-1), "TOP"),
        ("LEFTPADDING",  (0,0), (-1,-1), 0),
        ("RIGHTPADDING", (0,0), (-1,-1), 4),
        ("BOTTOMPADDING",(0,0), (-1,-1), 4),
        ("TOPPADDING",   (0,0), (-1,-1), 0),
    ]))
    return t

def section_box(title, content_items):
    """Lightly shaded section card."""
    inner = [h("h2", title)] + content_items
    return KeepTogether(inner)

# ── Document setup ────────────────────────────────────────────────────────────
doc = SimpleDocTemplate(
    OUTPUT,
    pagesize=A4,
    leftMargin=2*cm, rightMargin=2*cm,
    topMargin=2.2*cm, bottomMargin=2.2*cm,
    title="AvatarFit Project Report",
    author="Development Session",
    subject="Technical Report — AvatarFit v11",
)

story = []

# ═══════════════════════════════════════════════════════════════════════════════
# COVER PAGE
# ═══════════════════════════════════════════════════════════════════════════════
story += [
    Spacer(1, 3.5*cm),
    h("cover_title", "AvatarFit"),
    h("cover_sub",   "Project Technical Report"),
    space(8),
    rule(GOLD, 2),
    space(8),
    h("cover_sub",  "v11 — Full Feature Development Session"),
    space(4),
    h("cover_date", f"Generated {date.today().strftime('%B %d, %Y')}"),
    Spacer(1, 2*cm),
]

summary_data = [
    ("Project",     "AvatarFit — AI-powered personal form coach"),
    ("Tech Stack",  "MediaPipe Pose · HTML5 Canvas · Web Speech API · Vanilla JS"),
    ("Exercises",   "Squat · Bicep Curl · Lunge · Plank"),
    ("Key Files",   "workout.html · workout.js · skeleton.js · voice.js · avatars.js"),
    ("Report Type", "Full development session — architecture, features, bugs & fixes"),
]
story.append(stat_table(summary_data, [3.8*cm, None]))
story.append(PageBreak())

# ═══════════════════════════════════════════════════════════════════════════════
# 1. PROJECT OVERVIEW
# ═══════════════════════════════════════════════════════════════════════════════
story += [
    h("h1", "1. Project Overview"),
    rule(),
    body(
        "AvatarFit is a browser-based fitness coach that uses your webcam and Google's "
        "MediaPipe Pose model to track your body in real time, count repetitions, score "
        "your form, and give spoken coaching tips via the Web Speech API. Instead of "
        "rendering the raw camera feed, the app draws a stylised vector-capsule avatar "
        "on an HTML5 Canvas, coloured green for good form and red when errors are detected."
    ),
    space(),
    body(
        "The project supports four exercises — squats, bicep curls, lunges, and plank — "
        "plus a Workout Mode that chains all four in sequence with rest screens, exercise "
        "intros, and a comprehensive final summary. A main menu (index.html) lets the user "
        "pick their avatar and exercise before launching the workout session (workout.html)."
    ),
    space(),
    h("h2", "1.1 Architecture"),
    body("The codebase is intentionally kept framework-free — pure HTML, CSS, and JavaScript:"),
    space(4),
]

arch_rows = [
    ("workout.html",   "Main app shell. All overlays (summary, workout, rest, intro, gesture indicators) live as hidden divs."),
    ("workout.js",     "Core logic: session state machine, rep counting, form checking, HUD updates, workout flow, gestures."),
    ("skeleton.js",    "Converts raw MediaPipe landmark arrays to named pixel-space joint objects with extrapolation for off-screen joints."),
    ("voice.js",       "Speech synthesis (speak()) with per-text cooldowns; speech recognition for voice commands."),
    ("avatars.js",     "Vector capsule avatar renderer for characters 1–3."),
    ("girl_avatar.js", "PNG sprite-based renderer for character 4 (Zoe)."),
    ("themes.js",      "Canvas background themes and visual effects."),
    ("index.html",     "Main menu: character selection, exercise picker, and Full Workout launch button."),
]
story.append(stat_table(arch_rows, [3.8*cm, None]))
story.append(space(8))

story += [
    h("h2", "1.2 Session State Machine"),
    body("All session logic gates on a sessionPhase variable with these states:"),
    space(4),
    bullet("<b>waiting_permission</b> — camera not yet granted; permission overlay shown"),
    bullet("<b>waiting_frame</b>    — camera active but user not yet fully in frame"),
    bullet("<b>countdown</b>        — 3-2-1 countdown before reps begin"),
    bullet("<b>active</b>           — live tracking; reps counted, form checked every frame"),
    bullet("<b>paused</b>           — session paused (stop button)"),
    bullet("<b>ended</b>            — summary displayed; tracking stopped"),
]

# ═══════════════════════════════════════════════════════════════════════════════
# 2. FEATURE IMPLEMENTATION
# ═══════════════════════════════════════════════════════════════════════════════
story += [
    PageBreak(),
    h("h1", "2. Features Implemented This Session"),
    rule(),
]

# 2.1 Form Scoring
story += [
    h("h2", "2.1 Per-Exercise Form Checking"),
    body(
        "Each exercise has a dedicated branch in checkForm(joints, ex). The function returns "
        "{ok, formOk, ang, formError} where ok drives rep-counting thresholds and formOk "
        "drives the avatar colour and feedback banner. When formOk is false, the specific "
        "formError string is passed through updateHUD() → showTip() → speak() for coaching."
    ),
    space(4),
]

form_rows = [
    ("Squat",       "Knee valgus (cave-in ratio > 0.18), forward lean (extreme hunch, nose near shoulder line, threshold sw×0.15)"),
    ("Lunge",       "Knee valgus at relaxed threshold (> 0.26 — slightly looser than squat after tuning)"),
    ("Bicep Curl",  "Elbow flare (elbow drifts > 30% of shoulder-width laterally during the curl)"),
    ("Plank",       "Hip sag (hip drops below shoulder–ankle line) and hip pike (hips too high)"),
]
story.append(stat_table(form_rows))
story.append(space(8))

# 2.2 Squat Depth
story += [
    h("h2", "2.2 Squat & Lunge Depth Detection (Post-Rep)"),
    body(
        "Rather than checking depth in real time (which caused false positives mid-descent), "
        "depth is tracked via minDescentAngle — the lowest knee angle seen during a descent. "
        "The check fires after the rep completes:"
    ),
    space(4),
    bullet("hipInDescent flag is set when hip Y crosses downThreshold (hipBaseline + 7% of canvas height)."),
    bullet("minDescentAngle tracks the minimum knee angle throughout the descent."),
    bullet("On hip rise above upThreshold, countRep() fires. If minDescentAngle > 110°, a shallow-rep tip is shown 900 ms later."),
    bullet("The depth tip bypasses showTip()'s global 3-second debounce by writing directly to tipEl, avoiding blocking real-time form tips."),
    space(4),
    body(
        "This design means the depth warning 'Go deeper — aim for thighs parallel to the floor' always "
        "fires after the rep without interfering with the real-time knee-valgus coaching pipeline."
    ),
]

# 2.3 Rep Timing
story += [
    h("h2", "2.3 Too-Fast Rep Detection"),
    body(
        "lastRepTime is compared on each countRep() call. If the interval is below the "
        "per-exercise minimum (squat: 2 s, curl: 1.5 s, lunge: 2.5 s), the rep is flagged as tooFast. "
        "The tip fires and — crucially — errorTypeCounts['tooFast'] is incremented so the "
        "mistake appears in the session summary under 'Focus for next time'."
    ),
]

# 2.4 Workout Mode
story += [
    PageBreak(),
    h("h2", "2.4 Workout Mode"),
    body(
        "Workout Mode chains all four exercises in a fixed plan: 12 squats → 12 curls → "
        "10 lunges → 30 s plank. The WORKOUT_PLAN constant defines each step's exercise key "
        "and target. The flow is:"
    ),
    space(4),
    bullet("User clicks 'Full Workout' on the main menu or the 🏋️ button in-app."),
    bullet("startWorkoutMode() resets all counters and calls showExIntro() for the first exercise."),
    bullet("Each exercise intro overlay shows the goal, a tip, and prompts 'Do one rep to start' (voice line plays). The intro dismisses automatically on the first rep."),
    bullet("On reaching the target (reps or hold time), completeWorkoutStep() fires, saves a workoutLog entry, and shows either the rest screen or final summary."),
    bullet("Rest screens show the completed exercise stats and a 15-second countdown to the next exercise, with a 'Skip Rest' button."),
    bullet("setExercise() guards prevent manual exercise-switching during workout mode."),
    space(4),
    body("Each workoutLog entry captures: exercise key, form% (goodFrames/totalFrames), errorCount, "
         "errorTypeCounts snapshot, duration, reps/holdMs."),
]

# 2.5 Gestures
story += [
    h("h2", "2.5 Hand-Raise Gestures"),
    body(
        "The checkStopGesture() function runs every frame during active sessions. "
        "Two gestures are recognised — both require 3 seconds of sustained hold:"
    ),
    space(4),
    bullet("<b>Right hand raised</b> (wrist above shoulder, to the right of body centre) → End session / show summary. Pink ring fills on the top-right indicator."),
    bullet("<b>Left hand raised</b>  (wrist above shoulder, to the left of body centre)  → Cycle to next exercise (squat→curl→lunge→plank→squat). Green ring fills on the top-left indicator."),
    space(4),
    body(
        "If both hands are raised simultaneously, the stop gesture takes priority and the switch "
        "gesture is cancelled. Each has its own timestamp (gestureStopStart / gestureSwitchStart). "
        "The timer was reduced from 4 seconds to 3 seconds based on user feedback."
    ),
]

# 2.6 Avatar Picker
story += [
    h("h2", "2.6 In-App Avatar Picker"),
    body(
        "A 'Change' button in the sidebar 'Your Avatar' panel opens a full-screen modal "
        "(#avatarModal) showing the same four character portrait cards (inline SVG) as the "
        "main menu. Clicking a card calls setCharacter(num) which updates currentChar, "
        "syncs both the sidebar thumbnails and modal cards' active states, speaks the name, "
        "and closes the modal. The avatar updates on the next canvas render frame."
    ),
]

# 2.7 Main Menu
story += [
    h("h2", "2.7 Main Menu — Workout Mode Button"),
    body(
        "The index.html main menu gained a full-width gold 'Full Workout' card below the "
        "4-exercise grid. It displays the plan ('12 Squats · 12 Curls · 10 Lunges · 30s Plank') "
        "and navigates to workout.html?char={selectedChar}&workout=true, launching directly "
        "into Workout Mode with the selected avatar."
    ),
]

# ═══════════════════════════════════════════════════════════════════════════════
# 3. SESSION SUMMARY SCREENS
# ═══════════════════════════════════════════════════════════════════════════════
story += [
    PageBreak(),
    h("h1", "3. Session Summary Screens"),
    rule(),
    h("h2", "3.1 Single-Exercise Summary"),
    body(
        "Shown when the user ends a free-mode session. Displays: elapsed time, total reps "
        "(or plank hold time), form score %, and a 'Focus for next time' section. This section "
        "iterates errorTypeCounts sorted by frequency (top 3) and shows each error's label, "
        "occurrence count, and a specific fix tip from ERROR_DISPLAY."
    ),
    space(4),
    h("h2", "3.2 Workout Summary"),
    body(
        "Shown after all four exercises complete. The summary was significantly expanded "
        "during this session:"
    ),
    space(4),
    bullet("<b>Total Time</b> — full workout duration"),
    bullet("<b>Total Reps</b> — sum of reps across all rep-based exercises"),
    bullet("<b>Avg Form %</b> — mean of per-exercise form scores"),
    bullet("<b>Mistakes</b>  — total error events across the whole workout"),
    space(4),
    body("Each per-exercise row now expands to list that exercise's specific errors inline "
         "(e.g. '3× Knees caving in', '1× Reps too fast')."),
    space(4),
    body(
        "The 'All Mistakes' section at the bottom shows every error type with no cap "
        "(previously limited to 3), sorted by frequency, with the section title showing "
        "the total mistake count: 'All Mistakes (N total)'."
    ),
]

# ═══════════════════════════════════════════════════════════════════════════════
# 4. BUGS & FIXES
# ═══════════════════════════════════════════════════════════════════════════════
story += [
    PageBreak(),
    h("h1", "4. Bugs Encountered & Fixes"),
    rule(),
    body(
        "This section documents every significant bug found during development and how it "
        "was resolved. Many issues arose from subtle interactions between the real-time "
        "rendering pipeline, tip debouncing, and the rep-counting state machine."
    ),
    space(8),
]

bugs = [
    (
        "Bug 1 — Red legs on perfect reps",
        "tag_bug",
        "FORM FALSE POSITIVE",
        "The real-time depth check inside checkForm() compared the current knee angle against "
        "110° and set formOk = false when the angle was large. However, at the very START of "
        "every squat descent, the knee angle is naturally large (the person is just beginning "
        "to bend). This caused the avatar legs to flash red on every single rep — even perfect ones.",
        "Removed the real-time depth check from checkForm() entirely. Depth detection was "
        "moved fully into the post-rep branch of updateReps(), using the minDescentAngle "
        "tracker. The avatar now only turns red for valgus or forward lean, not for normal descent."
    ),
    (
        "Bug 2 — Knee valgus voice blocked after shallow-rep tip",
        "tag_bug",
        "DEBOUNCE COLLISION",
        "After a shallow rep, the depth tip was shown using showTip('shallowSquat', force=true). "
        "The force flag bypassed the 3-second global debounce check, but still set lastTipTime. "
        "This meant that any knee-valgus tip fired in the following 3 seconds was silently "
        "dropped — the user got no voice feedback for real-time valgus errors.",
        "Changed the depth post-rep tip to bypass showTip() entirely. It writes directly to "
        "tipEl.textContent and calls speak() independently, without touching lastTipTime. "
        "The real-time valgus pipeline now operates on its own debounce cycle, unaffected."
    ),
    (
        "Bug 3 — startCountdown vs runCountdown naming",
        "tag_bug",
        "REFERENCE ERROR",
        "Early Workout Mode code called startCountdown(3, callback) in several places. "
        "The actual function in the codebase is named runCountdown(onDone) with no count parameter.",
        "All occurrences replaced with runCountdown(callback)."
    ),
    (
        "Bug 4 — tooFast errors missing from summary",
        "tag_bug",
        "MISSING TRACKING",
        "The tooFast flag in countRep() correctly showed the real-time tip via showTip('tooFast'), "
        "but it never incremented errorTypeCounts['tooFast']. As a result, too-fast reps "
        "were coached in real time but completely invisible in the end-of-session summary.",
        "Added errorTypeCounts['tooFast'] = (errorTypeCounts['tooFast'] || 0) + 1 "
        "immediately before the showTip call in countRep()."
    ),
    (
        "Bug 5 — Workout Mode double-fire on completeWorkoutStep",
        "tag_bug",
        "RACE CONDITION",
        "If the workout auto-complete trigger and a manual stop gesture both fired within "
        "the same frame, completeWorkoutStep() could be called twice, causing duplicate "
        "rest screens or double-saves to workoutLog.",
        "Added a guard at the top of completeWorkoutStep(): if (sessionPhase === 'ended') return. "
        "Since the function sets sessionPhase = 'ended' on first call, any subsequent call "
        "within the same session is silently dropped."
    ),
    (
        "Bug 6 — Forward lean detection too sensitive",
        "tag_feat",
        "THRESHOLD TUNING",
        "The initial forward lean check used a threshold of sw * 0.55 (nose within 55% of "
        "shoulder-width above the shoulder midpoint). This triggered during normal squats "
        "when the user simply leaned slightly forward — a common and acceptable squat stance.",
        "Threshold tightened to sw * 0.15. The nose must now be within 15% of shoulder-width "
        "above the shoulder line before the error fires. This only catches genuinely extreme "
        "hunching where the chin approaches shoulder height. The user can adjust this constant "
        "if desired."
    ),
    (
        "Bug 7 — Lunge valgus threshold too strict",
        "tag_feat",
        "THRESHOLD TUNING",
        "The knee-valgus check used the same 0.18 threshold for both squats and lunges. "
        "In a lunge, the front knee naturally tracks slightly inward relative to the ankle "
        "due to the staggered stance, causing frequent false positives for users with "
        "normal lunge form.",
        "Split the threshold: squats remain at 0.18, lunges raised to 0.26. The lunge "
        "valgus flag now only fires when the knee caves in noticeably beyond normal variance."
    ),
]

for title, tag_style, tag_text, problem, fix in bugs:
    story.append(KeepTogether([
        h("h3", title),
        tag_table([
            (tag_style, tag_text, ""),
        ]),
        h("label", "Problem"),
        body(problem),
        h("label", "Fix"),
        body(fix),
        space(6),
        rule(GREY, 0.5),
        space(4),
    ]))

# ═══════════════════════════════════════════════════════════════════════════════
# 5. DESIGN DECISIONS
# ═══════════════════════════════════════════════════════════════════════════════
story += [
    PageBreak(),
    h("h1", "5. Key Design Decisions"),
    rule(),
    h("h2", "5.1 No Framework — Pure Vanilla JS"),
    body(
        "The entire app runs without React, Vue, or any build step. All state lives in "
        "module-level variables in workout.js. This makes the app instantly loadable from "
        "the filesystem (file:// protocol) without a server, which is essential since "
        "MediaPipe requires camera access from a context that may not always have a local server."
    ),
    space(8),
    h("h2", "5.2 Post-Rep vs Real-Time Form Checks"),
    body(
        "For errors that are ambiguous mid-rep (depth, speed), checks are deferred to the "
        "post-rep moment. Real-time checks (valgus, forward lean, elbow flare, hip sag) "
        "fire every frame but are gated behind BAD_FORM_CONFIRM_FRAMES = 18 consecutive "
        "bad frames (~0.6 s at 30 fps) before triggering audio and error counts. "
        "This eliminates noise from brief transitional positions."
    ),
    space(8),
    h("h2", "5.3 Tip Debouncing Strategy"),
    body(
        "Two independent debounce layers prevent audio spam: (1) showTip() has a 3-second "
        "global cooldown via lastTipTime — no tip of any kind fires within 3 s of the last. "
        "(2) speak() in voice.js has a 5-second per-text cooldown — the same sentence cannot "
        "be spoken twice within 5 s. Post-rep depth tips bypass layer (1) by writing directly "
        "to the DOM and calling speak() without touching lastTipTime."
    ),
    space(8),
    h("h2", "5.4 Avatar System"),
    body(
        "Characters 1–3 (Alex, Max, Sam) use a procedural vector-capsule renderer in avatars.js "
        "that draws body segments as rounded rectangles, scaling and rotating them based on "
        "joint positions from skeleton.js. Character 4 (Zoe) uses a PNG sprite sheet "
        "(girl_avatar.js) with individual limb images composited at runtime. Both renderers "
        "accept the same (ctx, joints, formOk, ex, charNum) interface so workout.js does not "
        "need to know which renderer is active."
    ),
    space(8),
    h("h2", "5.5 'Do One Rep to Start' — No Button Required"),
    body(
        "Rather than requiring a button click to begin each exercise in Workout Mode, the "
        "intro overlay stays up until the first rep is counted. The voice line 'Do one rep "
        "to start' is played immediately when the intro appears, and countRep() calls "
        "hideExIntro() on repCount === 1. Detection runs the entire time the intro is shown, "
        "so there is zero latency between the first rep and the overlay dismissing."
    ),
]

# ═══════════════════════════════════════════════════════════════════════════════
# 6. FILE CHANGE LOG
# ═══════════════════════════════════════════════════════════════════════════════
story += [
    PageBreak(),
    h("h1", "6. File Change Summary"),
    rule(),
]

changes = [
    ("workout.js", [
        "Added Workout Mode: WORKOUT_PLAN, workoutLog, workoutStepIdx, workoutStartTime, workoutPlankDone state vars",
        "Added startWorkoutMode(), completeWorkoutStep(), showRestScreen(), advanceWorkoutStep(), saveWorkoutStep(), exitWorkoutMode(), showWorkoutSummary()",
        "Added showExIntro() / hideExIntro() — exercise intro overlay with first-rep auto-dismiss",
        "Added depth tracking: hipInDescent flag, minDescentAngle, post-rep tip in updateReps()",
        "Added errorTypeCounts{} accumulator — incremented for all error types including tooFast",
        "Added checkStopGesture() — right hand stop (3s), left hand switch exercise (3s), separate timers & indicators",
        "Added cycleExercise() — cycles squat→curl→lunge→plank→squat on left-hand gesture",
        "Added setCharacter(num) and avatar modal JS (open/close/select handlers)",
        "Modified checkForm() squat/lunge branch: valgus threshold split (0.18 squat, 0.26 lunge), forward lean detection added",
        "Modified showSummary() to redirect to workout summary when workoutMode is true",
        "Modified showWorkoutSummary() to show total reps, per-exercise error breakdown, all mistakes (no cap)",
        "Modified countRep() to increment errorTypeCounts['tooFast'] when reps are too fast",
        "Fixed red-legs false positive by removing real-time depth check from checkForm()",
        "Fixed valgus-voice blocked by depth tip — depth tip no longer touches lastTipTime",
    ]),
    ("workout.html", [
        "Added #workoutBtn in topbar (gold gradient)",
        "Added #workoutProgressBadge (current step indicator)",
        "Added #workoutExIntroOverlay with .wxi-* styles",
        "Added #restOverlay with rest countdown and next-exercise preview",
        "Added #workoutSummaryOverlay with total-time, total-reps, avg-form, mistakes stats, per-exercise rows with error breakdown, all-mistakes section",
        "Added #gestureIndicator (right, pink, stop) and #gestureSwitchIndicator (left, green, switch) with SVG ring animations",
        "Added #avatarModal with full inline SVG portrait cards for all 4 characters",
        "Added 'Change' button to sidebar 'Your Avatar' panel",
        "Updated .wsum-ex-row to support nested .wsum-ex-top + .wsum-ex-errs for per-exercise mistake breakdown",
        "Added .wsum-section-label and .wsum-ex-err-item styles",
        "Bumped workout.js script tag from v=19 to v=21",
    ]),
    ("index.html", [
        "Added .btn-full-workout CSS (gold gradient, same sheen as exercise cards)",
        "Added Full Workout button HTML inside .exercise-section (below exercise grid)",
        "Added workoutModeBtn click handler navigating to workout.html?char=N&workout=true",
    ]),
]

for filename, items in changes:
    story.append(h("h2", filename))
    for item in items:
        story.append(bullet(item))
    story.append(space(6))

# ═══════════════════════════════════════════════════════════════════════════════
# 7. KNOWN LIMITATIONS
# ═══════════════════════════════════════════════════════════════════════════════
story += [
    PageBreak(),
    h("h1", "7. Known Limitations & Future Work"),
    rule(),
    h("h2", "7.1 Forward Lean Detection"),
    body(
        "The current forward lean check is a front-camera approximation: it measures how "
        "close the nose is to the shoulder midpoint in 2D screen space. True forward lean "
        "(torso tilting toward the camera) is a sagittal-plane motion that is not directly "
        "observable from a frontal view. The check is most effective for severe hunching "
        "where the chin drops toward the chest. A depth camera or side-view camera would "
        "enable accurate torso-angle measurement."
    ),
    space(8),
    h("h2", "7.2 Lunge Leg Side"),
    body(
        "The lunge currently measures the angle on the left leg only (computeAngle uses "
        "leftHip → leftKnee → leftAnkle). Users who lead with the right leg may receive "
        "inaccurate rep counts. A future improvement would detect which leg is forward "
        "and dynamically pick the appropriate joint chain."
    ),
    space(8),
    h("h2", "7.3 No Persistent Storage"),
    body(
        "Session data is not saved between visits. All errorTypeCounts, reps, and form "
        "scores are lost when the page closes. A future version could use localStorage or "
        "IndexedDB to persist workout history and show progress over time."
    ),
    space(8),
    h("h2", "7.4 Voice Recognition Conflicts"),
    body(
        "The Web Speech API's recognition engine calls speechSynthesis.cancel() before "
        "each speak() call. If a long coaching tip is playing and a rep fires a 'Rep N!' "
        "priority call, the tip is cut off. Priority speech (rep counts) deliberately "
        "interrupts non-priority tips, which is generally the desired behaviour but can "
        "feel abrupt during dense error periods."
    ),
    space(8),
    h("h2", "7.5 MediaPipe Landmark Extrapolation"),
    body(
        "When knees or ankles fall outside the camera frame, skeleton.js extrapolates their "
        "positions using the torso direction vector and estimated limb proportions. "
        "Extrapolated joints are less accurate and may cause brief false-positive valgus "
        "or depth readings for users who stand very close to the camera."
    ),
]

# ═══════════════════════════════════════════════════════════════════════════════
# 8. CONSTANTS REFERENCE
# ═══════════════════════════════════════════════════════════════════════════════
story += [
    PageBreak(),
    h("h1", "8. Key Constants Reference"),
    rule(),
    space(4),
]

constants = [
    ("BAD_FORM_CONFIRM_FRAMES",  "18",        "Consecutive bad frames before error is counted (~0.6 s at 30 fps)"),
    ("HIP_DOWN_RATIO",           "0.07",       "Hip must drop > 7% of canvas height below baseline to enter descent"),
    ("MIN_REP_MS (squat)",       "2000 ms",    "Minimum time between squat reps before 'too fast' fires"),
    ("MIN_REP_MS (curl)",        "1500 ms",    "Minimum time between curl reps"),
    ("MIN_REP_MS (lunge)",       "2500 ms",    "Minimum time between lunge reps"),
    ("Valgus threshold (squat)", "0.18",       "Max allowed (knee.x - ankle.x) / shoulderWidth before flagging"),
    ("Valgus threshold (lunge)", "0.26",       "Same check, relaxed for lunge stance geometry"),
    ("Depth threshold",          "110 deg",    "Minimum knee angle during descent; shallower = shallow rep warning"),
    ("Forward lean threshold",   "sw * 0.15",  "Nose must be within 15% of shoulder-width above shoulder line"),
    ("Gesture hold time",        "3000 ms",    "Duration right/left hand must be raised to trigger stop/switch"),
    ("Tip debounce (global)",    "3000 ms",    "Minimum gap between any two coaching tips (showTip lastTipTime)"),
    ("Speak cooldown",           "5000 ms",    "Per-text cooldown in voice.js for non-priority speech"),
    ("Speak cooldown (priority)","500 ms",     "Per-text cooldown for priority speech (rep counts)"),
    ("WORKOUT_PLAN",             "4 steps",    "squat×12, curl×12, lunge×10, plank×30 s"),
    ("REST_DURATION",            "15 s",       "Rest countdown between workout exercises"),
]

col_w = [5.2*cm, 2.5*cm, None]
header_row = [
    Paragraph("<b>Constant</b>",   styles["label"]),
    Paragraph("<b>Value</b>",      styles["label"]),
    Paragraph("<b>Description</b>",styles["label"]),
]
const_data = [header_row] + [
    [Paragraph(k, styles["code"]),
     Paragraph(v, styles["body"]),
     Paragraph(d, styles["body"])]
    for k, v, d in constants
]
ct = Table(const_data, colWidths=col_w)
ct.setStyle(TableStyle([
    ("BACKGROUND",    (0,0), (-1,0),  MID),
    ("TEXTCOLOR",     (0,0), (-1,0),  GOLD),
    ("ROWBACKGROUNDS",(0,1), (-1,-1), [colors.HexColor("#0F0D1E"), colors.HexColor("#16132B")]),
    ("GRID",          (0,0), (-1,-1), 0.3, colors.HexColor("#2D2A40")),
    ("LEFTPADDING",   (0,0), (-1,-1), 6),
    ("RIGHTPADDING",  (0,0), (-1,-1), 6),
    ("TOPPADDING",    (0,0), (-1,-1), 4),
    ("BOTTOMPADDING", (0,0), (-1,-1), 4),
    ("VALIGN",        (0,0), (-1,-1), "TOP"),
]))
story.append(ct)

# ═══════════════════════════════════════════════════════════════════════════════
# PAGE FOOTER CALLBACK
# ═══════════════════════════════════════════════════════════════════════════════
def on_page(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(GREY)
    canvas.setFont("Helvetica", 7.5)
    canvas.drawCentredString(A4[0]/2, 1.2*cm,
        f"AvatarFit Technical Report  •  Page {doc.page}  •  {date.today().strftime('%Y-%m-%d')}")
    canvas.restoreState()

def on_page_later(canvas, doc):
    on_page(canvas, doc)

doc.build(story, onFirstPage=on_page, onLaterPages=on_page_later)
print(f"PDF saved: {OUTPUT}")
