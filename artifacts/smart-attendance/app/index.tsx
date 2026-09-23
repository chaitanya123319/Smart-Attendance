import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Feather } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { KeyboardAwareScrollViewCompat } from '@/components/KeyboardAwareScrollViewCompat';
import colors from '@/constants/colors';

type Role = 'employee' | 'admin';
type EmployeeView = 'dashboard' | 'history' | 'leave' | 'profile';
type AdminView = 'overview' | 'employees' | 'records' | 'approvals' | 'profile';
type ViewName = EmployeeView | AdminView;
type AttendanceKind = 'Check in' | 'Check out';
type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

type AttendanceRecord = {
  id: string;
  kind: AttendanceKind;
  date: string;
  time: string;
  status: 'On time' | 'Late';
  location: string;
  photo?: string;
};

type LeaveRequest = {
  id: string;
  type: 'Casual' | 'Sick' | 'Earned';
  start: string;
  end: string;
  reason: string;
  status: LeaveStatus;
  employee: string;
  submitted: string;
};

type Employee = {
  id: string;
  name: string;
  role: string;
  site: string;
  initials: string;
  tone: string;
  status: 'Present' | 'Away' | 'On leave';
};

const theme = colors.light;
const DEFAULT_PHOTO =
  'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=180&q=80';
const SITE_NAME = 'Northstar Construction';

const mockAttendance: AttendanceRecord[] = [
  {
    id: 'a1',
    kind: 'Check in',
    date: 'Today',
    time: '08:42 AM',
    status: 'On time',
    location: 'Site A · Bengaluru',
    photo: DEFAULT_PHOTO,
  },
  {
    id: 'a2',
    kind: 'Check out',
    date: 'Yesterday',
    time: '06:15 PM',
    status: 'On time',
    location: 'Site A · Bengaluru',
    photo: DEFAULT_PHOTO,
  },
  {
    id: 'a3',
    kind: 'Check in',
    date: 'Aug 31, 2026',
    time: '09:12 AM',
    status: 'Late',
    location: 'Site A · Bengaluru',
    photo: DEFAULT_PHOTO,
  },
  {
    id: 'a4',
    kind: 'Check out',
    date: 'Aug 31, 2026',
    time: '06:03 PM',
    status: 'On time',
    location: 'Site A · Bengaluru',
    photo: DEFAULT_PHOTO,
  },
];

const mockLeaves: LeaveRequest[] = [
  {
    id: 'l1',
    type: 'Casual',
    start: 'Sep 11, 2026',
    end: 'Sep 12, 2026',
    reason: 'Personal work',
    status: 'Pending',
    employee: 'Arjun Mehta',
    submitted: 'Sep 04, 2026',
  },
  {
    id: 'l2',
    type: 'Sick',
    start: 'Aug 22, 2026',
    end: 'Aug 22, 2026',
    reason: 'Doctor appointment',
    status: 'Approved',
    employee: 'Arjun Mehta',
    submitted: 'Aug 21, 2026',
  },
  {
    id: 'l3',
    type: 'Earned',
    start: 'Jul 29, 2026',
    end: 'Jul 31, 2026',
    reason: 'Family travel',
    status: 'Rejected',
    employee: 'Arjun Mehta',
    submitted: 'Jul 16, 2026',
  },
];

const mockEmployees: Employee[] = [
  { id: 'e1', name: 'Arjun Mehta', role: 'Site Supervisor', site: 'Site A · Bengaluru', initials: 'AM', tone: '#DDF2EE', status: 'Present' },
  { id: 'e2', name: 'Priya Nair', role: 'Project Engineer', site: 'Site B · Mysuru', initials: 'PN', tone: '#E6ECFF', status: 'Present' },
  { id: 'e3', name: 'Rohan Kapoor', role: 'Safety Officer', site: 'Site A · Bengaluru', initials: 'RK', tone: '#FFF0D8', status: 'Away' },
  { id: 'e4', name: 'Maya Thomas', role: 'Quantity Surveyor', site: 'Site C · Hosur', initials: 'MT', tone: '#F1E6FF', status: 'On leave' },
  { id: 'e5', name: 'Vikram Shah', role: 'Foreman', site: 'Site B · Mysuru', initials: 'VS', tone: '#FFE3E3', status: 'Present' },
];

const employeeTabs: { key: EmployeeView; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: 'dashboard', label: 'Home', icon: 'grid' },
  { key: 'history', label: 'History', icon: 'clock' },
  { key: 'leave', label: 'Leave', icon: 'calendar' },
  { key: 'profile', label: 'Profile', icon: 'user' },
];

const adminTabs: { key: AdminView; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { key: 'overview', label: 'Overview', icon: 'grid' },
  { key: 'employees', label: 'Employees', icon: 'users' },
  { key: 'records', label: 'Attendance', icon: 'activity' },
  { key: 'approvals', label: 'Leave approvals', icon: 'check-square' },
  { key: 'profile', label: 'My profile', icon: 'user' },
];

function Icon({
  name,
  size = 20,
  color = theme.foreground,
}: {
  name: keyof typeof Feather.glyphMap;
  size?: number;
  color?: string;
}) {
  return <Feather name={name} size={size} color={color} />;
}

function Logo({ inverse = false }: { inverse?: boolean }) {
  return (
    <View style={styles.logoRow}>
      <View style={[styles.logoMark, inverse && styles.logoMarkInverse]}>
        <Icon name="check" size={17} color={inverse ? theme.navy : theme.card} />
      </View>
      <View>
        <Text style={[styles.logoTitle, inverse && styles.inverseText]}>NORTHSTAR</Text>
        <Text style={[styles.logoSubtitle, inverse && styles.inverseMuted]}>WORKFORCE</Text>
      </View>
    </View>
  );
}

function Button({
  label,
  onPress,
  icon,
  variant = 'primary',
  disabled = false,
  compact = false,
}: {
  label: string;
  onPress: () => void;
  icon?: keyof typeof Feather.glyphMap;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  disabled?: boolean;
  compact?: boolean;
}) {
  return (
    <Pressable
      testID={`button-${label.toLowerCase().replaceAll(' ', '-')}`}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        compact && styles.buttonCompact,
        variant === 'secondary' && styles.buttonSecondary,
        variant === 'ghost' && styles.buttonGhost,
        variant === 'danger' && styles.buttonDanger,
        disabled && styles.buttonDisabled,
        pressed && styles.pressed,
      ]}
    >
      {icon ? <Icon name={icon} size={compact ? 15 : 18} color={variant === 'primary' || variant === 'danger' ? theme.card : variant === 'ghost' ? theme.primary : theme.primary} /> : null}
      <Text style={[styles.buttonText, variant !== 'primary' && variant !== 'danger' && styles.buttonTextSecondary, compact && styles.buttonTextCompact]}>{label}</Text>
    </Pressable>
  );
}

function StatusBadge({ status }: { status: LeaveStatus | Employee['status'] | AttendanceRecord['status'] }) {
  const statusStyle =
    status === 'Approved' || status === 'Present' || status === 'On time'
      ? [styles.statusSuccess, styles.statusSuccessText]
      : status === 'Rejected' || status === 'On leave' || status === 'Late'
        ? [styles.statusDanger, styles.statusDangerText]
        : status === 'Away'
          ? [styles.statusNeutral, styles.statusNeutralText]
          : [styles.statusWarning, styles.statusWarningText];
  return (
    <View style={[styles.statusBadge, statusStyle[0]]}>
      <View style={[styles.statusDot, statusStyle[1]]} />
      <Text style={[styles.statusText, statusStyle[1]]}>{status}</Text>
    </View>
  );
}

function TopHeader({
  title,
  subtitle,
  onMenu,
  onProfile,
}: {
  title: string;
  subtitle?: string;
  onMenu?: () => void;
  onProfile?: () => void;
}) {
  return (
    <View style={styles.topHeader}>
      {onMenu ? (
        <Pressable testID="button-open-menu" onPress={onMenu} style={styles.iconButton}>
          <Icon name="menu" size={22} color={theme.foreground} />
        </Pressable>
      ) : null}
      <View style={styles.headerTextBlock}>
        <Text style={styles.eyebrow}>{subtitle ?? 'NORTHSTAR WORKFORCE'}</Text>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
      {onProfile ? (
        <Pressable testID="button-open-profile" onPress={onProfile} style={styles.avatarSmall}>
          <Text style={styles.avatarSmallText}>AM</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Toast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 3200);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);
  return (
    <Pressable onPress={onDismiss} style={styles.toast}>
      <View style={styles.toastIcon}><Icon name="check" size={14} color={theme.card} /></View>
      <Text style={styles.toastText}>{message}</Text>
      <Icon name="x" size={16} color={theme.card} />
    </Pressable>
  );
}

function LoginScreen({ onLogin }: { onLogin: (email: string) => void }) {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const topInset = Platform.OS === 'web' ? 67 : insets.top;

  const login = () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid work email to continue.');
      return;
    }
    if (!password.trim()) {
      setError('Enter your password to continue.');
      return;
    }
    onLogin(email.trim().toLowerCase());
  };

  return (
    <View style={styles.loginBackground}>
      <StatusBar style="light" />
      <LinearGradient colors={[theme.navy, '#173B69', theme.primary]} style={styles.loginHero}>
        <View style={{ paddingTop: topInset }}>
          <Logo inverse />
          <View style={styles.loginHeroCopy}>
            <View style={styles.livePill}><View style={styles.liveDot} /><Text style={styles.livePillText}>FIELD OPERATIONS PLATFORM</Text></View>
            <Text style={styles.loginTitle}>Every shift starts{'\n'}with certainty.</Text>
            <Text style={styles.loginDescription}>Secure attendance, transparent leave management, and a clearer view of your workforce.</Text>
          </View>
          <View style={styles.heroGeometry}>
            <View style={styles.geometryLine} />
            <View style={styles.geometryBlock}><Icon name="map-pin" size={24} color={theme.cyan} /></View>
          </View>
        </View>
      </LinearGradient>
      <KeyboardAwareScrollViewCompat
        style={styles.loginSheet}
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 24) + 16 }}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.loginSheetHandle} />
        <Text style={styles.formEyebrow}>WELCOME BACK</Text>
        <Text style={styles.loginSheetTitle}>Sign in to your workspace</Text>
        <Text style={styles.loginSheetSubtitle}>Use your Northstar work email to access your dashboard.</Text>
        <View style={styles.formGroup}>
          <Text style={styles.inputLabel}>Work email</Text>
          <View style={styles.inputWrap}>
            <Icon name="mail" size={18} color={theme.slate} />
            <TextInput
              testID="input-email"
              value={email}
              onChangeText={(value) => { setEmail(value); setError(''); }}
              placeholder="you@northstar.co"
              placeholderTextColor={theme.slate}
              autoCapitalize="none"
              keyboardType="email-address"
              style={styles.input}
            />
          </View>
        </View>
        <View style={styles.formGroup}>
          <View style={styles.labelRow}><Text style={styles.inputLabel}>Password</Text><Text style={styles.forgotText}>Forgot password?</Text></View>
          <View style={styles.inputWrap}>
            <Icon name="lock" size={18} color={theme.slate} />
            <TextInput
              testID="input-password"
              value={password}
              onChangeText={(value) => { setPassword(value); setError(''); }}
              placeholder="Enter your password"
              placeholderTextColor={theme.slate}
              secureTextEntry={!showPassword}
              style={styles.input}
            />
            <Pressable testID="button-toggle-password" onPress={() => setShowPassword((value) => !value)} hitSlop={10}>
              <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} color={theme.slate} />
            </Pressable>
          </View>
        </View>
        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        <Button label="Sign in" icon="arrow-right" onPress={login} />
        <View style={styles.loginHint}>
          <Icon name="info" size={15} color={theme.primary} />
          <Text style={styles.loginHintText}>Demo access: include “admin” in the email to view the admin console.</Text>
        </View>
        <View style={styles.loginFooter}><View style={styles.footerRule} /><Text style={styles.footerText}>Protected by Northstar security</Text><View style={styles.footerRule} /></View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

function EmployeeDashboard({ onCapture }: { onCapture: (kind: AttendanceKind) => void }) {
  const now = new Date();
  const greeting = now.getHours() < 12 ? 'Good morning' : now.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <View style={styles.dashboardGreeting}>
        <View>
          <Text style={styles.eyebrow}>FRIDAY · SEP 04, 2026</Text>
          <Text style={styles.greetingTitle}>{greeting}, Arjun</Text>
          <Text style={styles.greetingSub}>Ready for another productive day?</Text>
        </View>
        <View style={styles.avatarLarge}><Text style={styles.avatarLargeText}>AM</Text></View>
      </View>
      <LinearGradient colors={[theme.navy, '#1D4F8D']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.attendanceHero}>
        <View style={styles.heroTopRow}><View style={styles.heroLabel}><View style={styles.heroLiveDot} /><Text style={styles.heroLabelText}>TODAY'S ATTENDANCE</Text></View><Icon name="more-horizontal" size={20} color="#AFC8EC" /></View>
        <Text style={styles.heroTime}>08:42 <Text style={styles.heroAm}>AM</Text></Text>
        <View style={styles.heroBottomRow}><View><Text style={styles.heroMuted}>Checked in at</Text><Text style={styles.heroLocation}>Site A · Bengaluru</Text></View><View style={styles.heroStatus}><Icon name="check-circle" size={14} color={theme.cyan} /><Text style={styles.heroStatusText}>On time</Text></View></View>
      </LinearGradient>
      <Text style={styles.sectionTitle}>Mark attendance</Text>
      <View style={styles.actionRow}>
        <Pressable testID="button-check-in" onPress={() => onCapture('Check in')} style={({ pressed }) => [styles.attendanceAction, styles.checkInAction, pressed && styles.pressed]}>
          <View style={styles.actionIcon}><Icon name="log-in" size={22} color={theme.card} /></View><Text style={styles.attendanceActionTitle}>Check in</Text><Text style={styles.attendanceActionSub}>Start your shift</Text><View style={styles.actionArrow}><Icon name="arrow-up-right" size={18} color={theme.card} /></View>
        </Pressable>
        <Pressable testID="button-check-out" onPress={() => onCapture('Check out')} style={({ pressed }) => [styles.attendanceAction, styles.checkOutAction, pressed && styles.pressed]}>
          <View style={[styles.actionIcon, styles.actionIconDark]}><Icon name="log-out" size={22} color={theme.primary} /></View><Text style={[styles.attendanceActionTitle, styles.darkActionText]}>Check out</Text><Text style={[styles.attendanceActionSub, styles.darkActionSub]}>End your shift</Text><View style={styles.actionArrow}><Icon name="arrow-up-right" size={18} color={theme.primary} /></View>
        </Pressable>
      </View>
      <View style={styles.sectionHeadingRow}><Text style={styles.sectionTitle}>This week</Text><Text style={styles.linkText}>View history <Icon name="arrow-up-right" size={13} color={theme.primary} /></Text></View>
      <View style={styles.weekCard}>
        <View style={styles.weekSummary}><View><Text style={styles.weekNumber}>4</Text><Text style={styles.weekLabel}>Days present</Text></View><View style={styles.weekDivider} /><View><Text style={styles.weekNumber}>32h</Text><Text style={styles.weekLabel}>Hours logged</Text></View><View style={styles.weekRing}><Text style={styles.weekRingText}>80%</Text></View></View>
        <View style={styles.weekDays}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, index) => <View key={`${day}-${index}`} style={styles.dayColumn}><View style={[styles.dayDot, index < 4 && styles.dayDotActive, index === 4 && styles.dayDotToday]}><Text style={[styles.dayDotText, index < 4 && styles.dayDotTextActive]}>{index < 4 ? '✓' : index === 4 ? '•' : ''}</Text></View><Text style={[styles.dayLabel, index === 4 && styles.dayLabelToday]}>{day}</Text></View>)}</View>
      </View>
      <View style={styles.noticeCard}><View style={styles.noticeIcon}><Icon name="bell" size={18} color={theme.primary} /></View><View style={styles.noticeCopy}><Text style={styles.noticeTitle}>Leave balance updated</Text><Text style={styles.noticeSub}>You have 8 casual days remaining this year.</Text></View><Icon name="chevron-right" size={17} color={theme.slate} /></View>
    </ScrollView>
  );
}

function AttendanceHistory({ records }: { records: AttendanceRecord[] }) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <TopHeader title="Attendance history" subtitle="YOUR RECORDS" />
      <View style={styles.historySummary}><View><Text style={styles.summaryEyebrow}>SEPTEMBER 2026</Text><Text style={styles.summaryTitle}>92% attendance</Text><Text style={styles.summarySub}>You’re 4% above the team average</Text></View><View style={styles.summaryCircle}><Text style={styles.summaryCircleText}>22</Text><Text style={styles.summaryCircleLabel}>days</Text></View></View>
      <View style={styles.filterRow}><Pressable style={styles.filterPill}><Text style={styles.filterPillText}>This month</Text><Icon name="chevron-down" size={15} color={theme.primary} /></Pressable><Pressable style={styles.filterIcon}><Icon name="sliders" size={18} color={theme.slate} /></Pressable></View>
      <Text style={styles.sectionTitle}>Recent activity</Text>
      {records.map((record) => (
        <View key={record.id} style={styles.recordRow}>
          <Image source={{ uri: record.photo ?? DEFAULT_PHOTO }} style={styles.recordThumb} />
          <View style={styles.recordMain}><View style={styles.recordTitleRow}><Text style={styles.recordKind}>{record.kind}</Text><StatusBadge status={record.status} /></View><Text style={styles.recordDate}>{record.date} · {record.time}</Text><View style={styles.recordLocation}><Icon name="map-pin" size={12} color={theme.slate} /><Text style={styles.recordLocationText}>{record.location}</Text></View></View>
          <Icon name="chevron-right" size={17} color={theme.slate} />
        </View>
      ))}
      <View style={styles.endList}><View style={styles.endListLine} /><Text style={styles.endListText}>That’s all for now</Text><View style={styles.endListLine} /></View>
    </ScrollView>
  );
}

function LeaveManagement({ requests, onSubmit }: { requests: LeaveRequest[]; onSubmit: (request: LeaveRequest) => void }) {
  const [showForm, setShowForm] = useState(false);
  const [leaveType, setLeaveType] = useState<LeaveRequest['type']>('Casual');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [reason, setReason] = useState('');
  const [attachment, setAttachment] = useState('');
  const [formError, setFormError] = useState('');

  const attach = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.7 });
    if (!result.canceled) setAttachment(result.assets[0]?.uri ?? '');
  };
  const submit = () => {
    if (!start.trim() || !end.trim() || !reason.trim()) {
      setFormError('Add dates and a short reason before submitting.');
      return;
    }
    onSubmit({ id: `l-${Date.now()}`, type: leaveType, start, end, reason, status: 'Pending', employee: 'Arjun Mehta', submitted: 'Sep 04, 2026' });
    setStart(''); setEnd(''); setReason(''); setAttachment(''); setFormError(''); setShowForm(false);
  };

  if (showForm) {
    return (
      <KeyboardAwareScrollViewCompat style={styles.screen} contentContainerStyle={styles.screenContent} bottomOffset={32} keyboardShouldPersistTaps="handled">
        <View style={styles.formHeader}><Pressable testID="button-close-leave-form" onPress={() => setShowForm(false)} style={styles.iconButton}><Icon name="arrow-left" size={21} color={theme.foreground} /></Pressable><View><Text style={styles.eyebrow}>TIME AWAY</Text><Text style={styles.headerTitle}>Apply for leave</Text></View></View>
        <Text style={styles.formIntro}>Plan time away with a request your manager can review.</Text>
        <Text style={styles.inputLabel}>Leave type</Text>
        <View style={styles.segmentRow}>{(['Casual', 'Sick', 'Earned'] as const).map((type) => <Pressable key={type} onPress={() => setLeaveType(type)} style={[styles.segment, leaveType === type && styles.segmentActive]}><Text style={[styles.segmentText, leaveType === type && styles.segmentTextActive]}>{type}</Text></Pressable>)}</View>
        <View style={styles.dateRow}><View style={styles.dateField}><Text style={styles.inputLabel}>Start date</Text><View style={styles.inputWrap}><Icon name="calendar" size={17} color={theme.slate} /><TextInput testID="input-start-date" value={start} onChangeText={setStart} placeholder="DD / MM / YYYY" placeholderTextColor={theme.slate} style={styles.input} /></View></View><View style={styles.dateField}><Text style={styles.inputLabel}>End date</Text><View style={styles.inputWrap}><Icon name="calendar" size={17} color={theme.slate} /><TextInput testID="input-end-date" value={end} onChangeText={setEnd} placeholder="DD / MM / YYYY" placeholderTextColor={theme.slate} style={styles.input} /></View></View></View>
        <Text style={styles.inputLabel}>Reason</Text><TextInput testID="input-leave-reason" value={reason} onChangeText={setReason} placeholder="Tell us a little about your leave..." placeholderTextColor={theme.slate} multiline style={[styles.inputStandalone, styles.textArea]} />
        <Text style={styles.inputLabel}>Attachment <Text style={styles.optionalText}>· optional</Text></Text>
        <Pressable testID="button-attach-file" onPress={attach} style={styles.attachmentBox}><Icon name={attachment ? 'check-circle' : 'paperclip'} size={19} color={attachment ? theme.success : theme.primary} /><Text style={styles.attachmentText}>{attachment ? 'Attachment added' : 'Add supporting document'}</Text><Icon name="plus" size={18} color={theme.slate} /></Pressable>
        {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
        <Button label="Submit request" icon="send" onPress={submit} />
      </KeyboardAwareScrollViewCompat>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <TopHeader title="Leave management" subtitle="TIME AWAY" />
      <View style={styles.leaveHero}><View><Text style={styles.leaveHeroEyebrow}>YOUR BALANCE</Text><Text style={styles.leaveHeroTitle}>Time off, made clear.</Text><Text style={styles.leaveHeroSub}>Use it when you need it. Plan it when you can.</Text></View><Icon name="sun" size={42} color={theme.cyan} /></View>
      <View style={styles.balanceRow}><View style={styles.balanceItem}><Text style={styles.balanceNumber}>8</Text><Text style={styles.balanceLabel}>Casual left</Text><View style={styles.balanceBar}><View style={[styles.balanceBarFill, { width: '64%' }]} /></View></View><View style={styles.balanceItem}><Text style={styles.balanceNumber}>5</Text><Text style={styles.balanceLabel}>Sick left</Text><View style={styles.balanceBar}><View style={[styles.balanceBarFill, styles.balanceBarTeal, { width: '42%' }]} /></View></View><View style={styles.balanceItem}><Text style={styles.balanceNumber}>12</Text><Text style={styles.balanceLabel}>Earned left</Text><View style={styles.balanceBar}><View style={[styles.balanceBarFill, styles.balanceBarGold, { width: '78%' }]} /></View></View></View>
      <Button label="Apply for leave" icon="plus" onPress={() => setShowForm(true)} />
      <View style={styles.sectionHeadingRow}><Text style={styles.sectionTitle}>My leave history</Text><Text style={styles.linkText}>See all <Icon name="arrow-up-right" size={13} color={theme.primary} /></Text></View>
      {requests.map((request) => <View key={request.id} style={styles.leaveRow}><View style={styles.leaveDateBox}><Text style={styles.leaveDateMonth}>{request.start.split(' ')[0]}</Text><Text style={styles.leaveDateDay}>{request.start.split(' ')[1]?.replace(',', '')}</Text></View><View style={styles.leaveMain}><View style={styles.recordTitleRow}><Text style={styles.recordKind}>{request.type} leave</Text><StatusBadge status={request.status} /></View><Text style={styles.recordDate}>{request.start} → {request.end}</Text><Text style={styles.leaveReason}>{request.reason}</Text></View><Icon name="chevron-right" size={17} color={theme.slate} /></View>)}
    </ScrollView>
  );
}

function ProfileScreen({ role, onLogout }: { role: Role; onLogout: () => void }) {
  const isAdmin = role === 'admin';
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <TopHeader title="My profile" subtitle="ACCOUNT" />
      <View style={styles.profileHero}><View style={styles.profileAvatar}><Text style={styles.profileAvatarText}>{isAdmin ? 'SK' : 'AM'}</Text><View style={styles.profileOnline} /></View><Text style={styles.profileName}>{isAdmin ? 'Sanjay Kulkarni' : 'Arjun Mehta'}</Text><Text style={styles.profileRole}>{isAdmin ? 'Workspace Administrator' : 'Site Supervisor'}</Text><View style={styles.profileSite}><Icon name="map-pin" size={13} color={theme.primary} /><Text style={styles.profileSiteText}>{isAdmin ? 'All sites · India' : 'Site A · Bengaluru'}</Text></View></View>
      <View style={styles.profileDetails}><View style={styles.detailRow}><View style={styles.detailIcon}><Icon name="mail" size={17} color={theme.primary} /></View><View><Text style={styles.detailLabel}>Work email</Text><Text style={styles.detailValue}>{isAdmin ? 'sanjay@northstar.co' : 'arjun.mehta@northstar.co'}</Text></View></View><View style={styles.detailRow}><View style={styles.detailIcon}><Icon name="briefcase" size={17} color={theme.primary} /></View><View><Text style={styles.detailLabel}>Role</Text><Text style={styles.detailValue}>{isAdmin ? 'Admin' : 'Employee'}</Text></View></View><View style={styles.detailRow}><View style={styles.detailIcon}><Icon name="shield" size={17} color={theme.primary} /></View><View><Text style={styles.detailLabel}>Account status</Text><View style={styles.accountStatus}><View style={styles.accountStatusDot} /><Text style={styles.accountStatusText}>Active and verified</Text></View></View></View></View>
      <Button label="Log out" icon="log-out" variant="secondary" onPress={onLogout} />
      <Text style={styles.versionText}>Northstar Workforce · v1.0.0</Text>
    </ScrollView>
  );
}

function AdminOverview({ onNavigate }: { onNavigate: (view: AdminView) => void }) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <TopHeader title="Command center" subtitle="ADMIN CONSOLE" />
      <View style={styles.adminWelcome}><View><Text style={styles.greetingTitle}>Good morning, Sanjay</Text><Text style={styles.greetingSub}>Here’s your workforce snapshot.</Text></View><View style={styles.avatarLargeAdmin}><Text style={styles.avatarLargeText}>SK</Text></View></View>
      <View style={styles.adminGrid}><Pressable onPress={() => onNavigate('employees')} style={styles.adminMetric}><View style={[styles.metricIcon, styles.metricBlue]}><Icon name="users" size={18} color={theme.primary} /></View><Text style={styles.metricNumber}>128</Text><Text style={styles.metricLabel}>Total employees</Text><Text style={styles.metricTrend}>↑ 4 this month</Text></Pressable><Pressable onPress={() => onNavigate('records')} style={styles.adminMetric}><View style={[styles.metricIcon, styles.metricTeal]}><Icon name="user-check" size={18} color={theme.success} /></View><Text style={styles.metricNumber}>96</Text><Text style={styles.metricLabel}>Present today</Text><Text style={styles.metricTrend}>75% of workforce</Text></Pressable><Pressable onPress={() => onNavigate('approvals')} style={styles.adminMetric}><View style={[styles.metricIcon, styles.metricGold]}><Icon name="calendar" size={18} color={theme.warning} /></View><Text style={styles.metricNumber}>12</Text><Text style={styles.metricLabel}>On leave today</Text><Text style={styles.metricTrend}>9% of workforce</Text></Pressable><Pressable onPress={() => onNavigate('approvals')} style={styles.adminMetric}><View style={[styles.metricIcon, styles.metricRed]}><Icon name="inbox" size={18} color={theme.destructive} /></View><Text style={styles.metricNumber}>7</Text><Text style={styles.metricLabel}>Pending requests</Text><Text style={styles.metricTrendRed}>Needs review</Text></Pressable></View>
      <View style={styles.adminChartCard}><View style={styles.sectionHeadingRow}><View><Text style={styles.sectionTitle}>Attendance pulse</Text><Text style={styles.cardSub}>Last 7 working days</Text></View><Pressable style={styles.chartFilter}><Text style={styles.chartFilterText}>Week</Text><Icon name="chevron-down" size={13} color={theme.slate} /></Pressable></View><View style={styles.chart}><View style={styles.chartAxis}><Text>100%</Text><Text>75%</Text><Text>50%</Text><Text>25%</Text></View><View style={styles.chartBars}>{[72, 86, 78, 91, 76, 88, 94].map((height, index) => <View key={index} style={styles.chartBarColumn}><View style={[styles.chartBar, { height: height * 0.8 }]} /><Text style={styles.chartDay}>{['M', 'T', 'W', 'T', 'F', 'S', 'S'][index]}</Text></View>)}</View></View></View>
      <View style={styles.sectionHeadingRow}><Text style={styles.sectionTitle}>Needs your attention</Text><Text style={styles.linkText}>View all <Icon name="arrow-up-right" size={13} color={theme.primary} /></Text></View>
      <Pressable onPress={() => onNavigate('approvals')} style={styles.attentionRow}><View style={styles.attentionIcon}><Icon name="calendar" size={18} color={theme.warning} /></View><View style={styles.attentionCopy}><Text style={styles.attentionTitle}>7 leave requests pending</Text><Text style={styles.attentionSub}>The oldest request is from yesterday</Text></View><Icon name="chevron-right" size={17} color={theme.slate} /></Pressable>
      <Pressable onPress={() => onNavigate('records')} style={styles.attentionRow}><View style={[styles.attentionIcon, styles.attentionIconRed]}><Icon name="alert-circle" size={18} color={theme.destructive} /></View><View style={styles.attentionCopy}><Text style={styles.attentionTitle}>4 late check-ins today</Text><Text style={styles.attentionSub}>Across 3 active construction sites</Text></View><Icon name="chevron-right" size={17} color={theme.slate} /></Pressable>
    </ScrollView>
  );
}

function AdminEmployees() {
  const [query, setQuery] = useState('');
  const filtered = mockEmployees.filter((employee) => employee.name.toLowerCase().includes(query.toLowerCase()) || employee.role.toLowerCase().includes(query.toLowerCase()));
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <TopHeader title="Employees" subtitle="PEOPLE DIRECTORY" />
      <View style={styles.directoryHeader}><Text style={styles.sectionTitle}>128 people</Text><Pressable style={styles.filterIcon}><Icon name="download" size={17} color={theme.slate} /></Pressable></View>
      <View style={styles.inputWrap}><Icon name="search" size={18} color={theme.slate} /><TextInput testID="input-employee-search" value={query} onChangeText={setQuery} placeholder="Search by name or role" placeholderTextColor={theme.slate} style={styles.input} /><Icon name="sliders" size={17} color={theme.slate} /></View>
      <View style={styles.directoryFilters}><Pressable style={styles.filterPill}><Text style={styles.filterPillText}>All sites</Text><Icon name="chevron-down" size={14} color={theme.primary} /></Pressable><Pressable style={styles.filterPill}><Text style={styles.filterPillText}>All status</Text><Icon name="chevron-down" size={14} color={theme.primary} /></Pressable></View>
      {filtered.map((employee) => <View key={employee.id} style={styles.employeeRow}><View style={[styles.employeeAvatar, { backgroundColor: employee.tone }]}><Text style={styles.employeeAvatarText}>{employee.initials}</Text></View><View style={styles.employeeMain}><Text style={styles.employeeName}>{employee.name}</Text><Text style={styles.employeeRole}>{employee.role}</Text><View style={styles.employeeSite}><Icon name="map-pin" size={11} color={theme.slate} /><Text style={styles.employeeSiteText}>{employee.site}</Text></View></View><View style={styles.employeeStatus}><StatusBadge status={employee.status} /><Icon name="more-vertical" size={18} color={theme.slate} /></View></View>)}
      {filtered.length === 0 ? <View style={styles.emptyState}><Icon name="search" size={28} color={theme.slate} /><Text style={styles.emptyTitle}>No employees found</Text><Text style={styles.emptySub}>Try a different name or role.</Text></View> : null}
    </ScrollView>
  );
}

function AdminRecords() {
  const [query, setQuery] = useState('');
  const records = [
    { name: 'Arjun Mehta', site: 'Site A · Bengaluru', time: '08:42 AM', kind: 'Check in', status: 'On time' as const, initials: 'AM', tone: '#DDF2EE' },
    { name: 'Priya Nair', site: 'Site B · Mysuru', time: '08:51 AM', kind: 'Check in', status: 'On time' as const, initials: 'PN', tone: '#E6ECFF' },
    { name: 'Rohan Kapoor', site: 'Site A · Bengaluru', time: '09:18 AM', kind: 'Check in', status: 'Late' as const, initials: 'RK', tone: '#FFF0D8' },
    { name: 'Vikram Shah', site: 'Site B · Mysuru', time: '09:24 AM', kind: 'Check in', status: 'Late' as const, initials: 'VS', tone: '#FFE3E3' },
  ].filter((record) => record.name.toLowerCase().includes(query.toLowerCase()));
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <TopHeader title="Attendance records" subtitle="WORKFORCE ACTIVITY" />
      <View style={styles.recordsHero}><View><Text style={styles.recordsHeroEyebrow}>TODAY · SEP 04</Text><Text style={styles.recordsHeroTitle}>96 present</Text><Text style={styles.recordsHeroSub}>75% checked in by 10:00 AM</Text></View><View style={styles.recordsProgress}><Text style={styles.recordsProgressText}>75%</Text></View></View>
      <View style={styles.inputWrap}><Icon name="search" size={18} color={theme.slate} /><TextInput value={query} onChangeText={setQuery} placeholder="Search employees" placeholderTextColor={theme.slate} style={styles.input} /><Icon name="calendar" size={17} color={theme.slate} /></View>
      <View style={styles.directoryFilters}><Pressable style={styles.filterPill}><Text style={styles.filterPillText}>Today</Text><Icon name="chevron-down" size={14} color={theme.primary} /></Pressable><Pressable style={styles.filterPill}><Text style={styles.filterPillText}>All sites</Text><Icon name="chevron-down" size={14} color={theme.primary} /></Pressable></View>
      <View style={styles.sectionHeadingRow}><Text style={styles.sectionTitle}>Live activity</Text><View style={styles.liveLabel}><View style={styles.liveDotBlue} /><Text style={styles.liveLabelText}>LIVE</Text></View></View>
      {records.map((record) => <View key={record.name} style={styles.employeeRow}><View style={[styles.employeeAvatar, { backgroundColor: record.tone }]}><Text style={styles.employeeAvatarText}>{record.initials}</Text></View><View style={styles.employeeMain}><Text style={styles.employeeName}>{record.name}</Text><Text style={styles.employeeRole}>{record.kind} · {record.time}</Text><View style={styles.employeeSite}><Icon name="map-pin" size={11} color={theme.slate} /><Text style={styles.employeeSiteText}>{record.site}</Text></View></View><StatusBadge status={record.status} /></View>)}
    </ScrollView>
  );
}

function AdminApprovals({ requests, onDecision }: { requests: LeaveRequest[]; onDecision: (id: string, status: LeaveStatus) => void }) {
  const pending = requests.filter((request) => request.status === 'Pending');
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent} showsVerticalScrollIndicator={false}>
      <TopHeader title="Leave approvals" subtitle="REVIEW CENTER" />
      <View style={styles.approvalIntro}><View style={styles.approvalCount}><Text style={styles.approvalCountNumber}>{pending.length}</Text><Text style={styles.approvalCountLabel}>pending requests</Text></View><Text style={styles.approvalIntroCopy}>Review and respond to time-off requests from your teams.</Text></View>
      {pending.length === 0 ? <View style={styles.emptyState}><View style={styles.emptyIcon}><Icon name="check" size={24} color={theme.success} /></View><Text style={styles.emptyTitle}>All caught up</Text><Text style={styles.emptySub}>There are no leave requests waiting for review.</Text></View> : pending.map((request) => <View key={request.id} style={styles.approvalCard}><View style={styles.approvalTop}><View style={styles.employeeAvatar}><Text style={styles.employeeAvatarText}>AM</Text></View><View style={styles.employeeMain}><Text style={styles.employeeName}>{request.employee}</Text><Text style={styles.employeeRole}>{request.type} leave · submitted {request.submitted}</Text></View><StatusBadge status={request.status} /></View><View style={styles.approvalDetails}><View><Text style={styles.detailLabel}>Requested dates</Text><Text style={styles.detailValue}>{request.start} → {request.end}</Text></View><View><Text style={styles.detailLabel}>Reason</Text><Text style={styles.detailValue}>{request.reason}</Text></View></View><View style={styles.approvalButtons}><Button label="Reject" icon="x" variant="danger" compact onPress={() => onDecision(request.id, 'Rejected')} /><Button label="Approve" icon="check" compact onPress={() => onDecision(request.id, 'Approved')} /></View></View>)}
    </ScrollView>
  );
}

function Drawer({ role, activeView, onNavigate, onClose, onLogout }: { role: Role; activeView: ViewName; onNavigate: (view: ViewName) => void; onClose: () => void; onLogout: () => void }) {
  const tabs = role === 'admin' ? adminTabs : employeeTabs;
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose}>
      <View style={styles.drawerBackdrop}><Pressable style={styles.drawerScrim} onPress={onClose} /><View style={styles.drawer}><View style={styles.drawerTop}><Logo /><Pressable testID="button-close-menu" onPress={onClose} style={styles.iconButton}><Icon name="x" size={20} color={theme.slate} /></Pressable></View><View style={styles.drawerIdentity}><View style={styles.avatarLarge}><Text style={styles.avatarLargeText}>{role === 'admin' ? 'SK' : 'AM'}</Text></View><Text style={styles.drawerName}>{role === 'admin' ? 'Sanjay Kulkarni' : 'Arjun Mehta'}</Text><Text style={styles.drawerRole}>{role === 'admin' ? 'Administrator' : 'Site Supervisor'}</Text></View><View style={styles.drawerLinks}>{tabs.map((tab) => <Pressable key={tab.key} onPress={() => { onNavigate(tab.key); onClose(); }} style={[styles.drawerLink, activeView === tab.key && styles.drawerLinkActive]}><Icon name={tab.icon} size={19} color={activeView === tab.key ? theme.primary : theme.slate} /><Text style={[styles.drawerLinkText, activeView === tab.key && styles.drawerLinkTextActive]}>{tab.label}</Text>{activeView === tab.key ? <View style={styles.drawerActiveBar} /> : null}</Pressable>)}</View><Pressable onPress={onLogout} style={styles.drawerLogout}><Icon name="log-out" size={18} color={theme.destructive} /><Text style={styles.drawerLogoutText}>Log out</Text></Pressable></View></View>
    </Modal>
  );
}

function CameraCapture({ kind, onComplete, onCancel }: { kind: AttendanceKind; onComplete: (photo: string, location: string) => void; onCancel: () => void }) {
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [locationPermission, requestLocationPermission] = Location.useForegroundPermissions();
  const [loading, setLoading] = useState(false);
  const [permissionMessage, setPermissionMessage] = useState('');

  useEffect(() => {
    if (!permission?.granted && permission?.canAskAgain) requestPermission();
    if (!locationPermission?.granted && locationPermission?.canAskAgain) requestLocationPermission();
  }, [permission?.granted, locationPermission?.granted]);

  const capture = async () => {
    setLoading(true);
    try {
      let photoUri = DEFAULT_PHOTO;
      if (Platform.OS !== 'web') {
        const photo = await cameraRef.current?.takePictureAsync({ quality: 0.72 });
        if (photo?.uri) photoUri = photo.uri;
      } else {
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.72 });
        if (!result.canceled && result.assets[0]?.uri) photoUri = result.assets[0].uri;
      }
      let locationText = 'Location unavailable';
      if (locationPermission?.granted) {
        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        locationText = `${location.coords.latitude.toFixed(4)}, ${location.coords.longitude.toFixed(4)}`;
      }
      onComplete(photoUri, locationText);
    } catch {
      setPermissionMessage('We couldn’t access the camera or location. Check permissions and try again.');
    } finally {
      setLoading(false);
    }
  };

  const canCapture = permission?.granted || Platform.OS === 'web';
  return (
    <Modal visible animationType="slide" onRequestClose={onCancel}>
      <View style={styles.cameraScreen}><StatusBar style="light" />{canCapture && Platform.OS !== 'web' ? <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" /> : <View style={styles.cameraWebFallback}><Icon name="camera" size={52} color={theme.cyan} /><Text style={styles.cameraFallbackTitle}>Camera ready</Text><Text style={styles.cameraFallbackSub}>Your browser will ask for camera access when you capture.</Text></View>}<View style={styles.cameraOverlay}><View style={styles.cameraHeader}><Pressable onPress={onCancel} style={styles.cameraClose}><Icon name="x" size={22} color={theme.card} /></Pressable><View><Text style={styles.cameraTitle}>{kind}</Text><Text style={styles.cameraSubtitle}>Capture your live attendance photo</Text></View><View style={styles.cameraStep}><Text style={styles.cameraStepText}>1 / 1</Text></View></View><View style={styles.cameraGuide}><View style={[styles.guideCorner, styles.guideTopLeft]} /><View style={[styles.guideCorner, styles.guideTopRight]} /><View style={[styles.guideCorner, styles.guideBottomLeft]} /><View style={[styles.guideCorner, styles.guideBottomRight]} /><Icon name="user" size={44} color="rgba(255,255,255,0.75)" /></View><View style={styles.cameraBottom}><Text style={styles.cameraHint}><Icon name="map-pin" size={13} color={theme.cyan} /> GPS coordinates will be added automatically</Text><Pressable testID="button-take-photo" onPress={capture} disabled={loading} style={({ pressed }) => [styles.shutter, pressed && styles.pressed]}><View style={styles.shutterInner}>{loading ? <Icon name="loader" size={22} color={theme.navy} /> : <Icon name="camera" size={24} color={theme.navy} />}</View></Pressable><Text style={styles.cameraBottomLabel}>{loading ? 'Processing...' : 'Tap to capture'}</Text></View></View></View>
      {permissionMessage ? <View style={styles.cameraError}><Text style={styles.cameraErrorText}>{permissionMessage}</Text><Button label="Close" onPress={onCancel} variant="secondary" compact /></View> : null}
    </Modal>
  );
}

function ConfirmationScreen({ kind, photo, location, timestamp, onSubmit, onRetake }: { kind: AttendanceKind; photo: string; location: string; timestamp: Date; onSubmit: () => void; onRetake: () => void }) {
  return (
    <View style={styles.confirmationScreen}><StatusBar style="light" /><LinearGradient colors={[theme.navy, '#1A4270']} style={styles.confirmationTop}><View style={styles.confirmationHeader}><Pressable onPress={onRetake} style={styles.cameraClose}><Icon name="arrow-left" size={21} color={theme.card} /></Pressable><Text style={styles.confirmationHeaderTitle}>Review attendance</Text><View style={{ width: 42 }} /></View><View style={styles.confirmPhotoWrap}><Image source={{ uri: photo }} style={styles.confirmPhoto} /><View style={styles.photoCheck}><Icon name="check" size={15} color={theme.card} /></View></View><Text style={styles.confirmTitle}>Looks good.</Text><Text style={styles.confirmSub}>Review the details before submitting your {kind.toLowerCase()}.</Text></LinearGradient><ScrollView style={styles.confirmationDetails} contentContainerStyle={{ paddingBottom: 32 }}><View style={styles.confirmDetailsCard}><View style={styles.confirmDetailRow}><View style={styles.confirmDetailIcon}><Icon name="activity" size={18} color={theme.primary} /></View><View><Text style={styles.detailLabel}>Attendance type</Text><Text style={styles.detailValue}>{kind}</Text></View></View><View style={styles.confirmDetailRow}><View style={styles.confirmDetailIcon}><Icon name="clock" size={18} color={theme.primary} /></View><View><Text style={styles.detailLabel}>Date & time</Text><Text style={styles.detailValue}>{timestamp.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} · {timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Text></View></View><View style={styles.confirmDetailRow}><View style={styles.confirmDetailIcon}><Icon name="map-pin" size={18} color={theme.primary} /></View><View><Text style={styles.detailLabel}>GPS coordinates</Text><Text style={styles.detailValue}>{location}</Text></View></View></View><View style={styles.confirmPrivacy}><Icon name="shield" size={17} color={theme.success} /><Text style={styles.confirmPrivacyText}>Your photo and location are encrypted and shared only with your workspace.</Text></View><Button label="Submit attendance" icon="check" onPress={onSubmit} /><Pressable onPress={onRetake} style={styles.retakeButton}><Text style={styles.retakeText}>Retake photo</Text></Pressable></ScrollView></View>
  );
}

export default function Index() {
  const [role, setRole] = useState<Role | null>(null);
  const [activeView, setActiveView] = useState<ViewName>('dashboard');
  const [attendance, setAttendance] = useState<AttendanceRecord[]>(mockAttendance);
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>(mockLeaves);
  const [captureKind, setCaptureKind] = useState<AttendanceKind | null>(null);
  const [confirmation, setConfirmation] = useState<{ kind: AttendanceKind; photo: string; location: string; timestamp: Date } | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (message: string) => setToast(message);
  const login = (email: string) => { const nextRole = email.includes('admin') ? 'admin' : 'employee'; setRole(nextRole); setActiveView(nextRole === 'admin' ? 'overview' : 'dashboard'); };
  const logout = () => { setRole(null); setDrawerOpen(false); setConfirmation(null); };
  const navigate = (view: ViewName) => setActiveView(view);
  const handleCaptureComplete = (photo: string, location: string) => { if (captureKind) { setConfirmation({ kind: captureKind, photo, location, timestamp: new Date() }); setCaptureKind(null); } };
  const submitAttendance = () => {
    if (!confirmation) return;
    const date = confirmation.timestamp.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    const time = confirmation.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    setAttendance((current) => [{ id: `a-${Date.now()}`, kind: confirmation.kind, date: date === '04 Sep 2026' ? 'Today' : date, time, status: 'On time', location: confirmation.location, photo: confirmation.photo }, ...current]);
    setConfirmation(null);
    showToast(`${confirmation.kind} submitted successfully`);
  };

  const employeeView = useMemo(() => {
    switch (activeView as EmployeeView) {
      case 'history': return <AttendanceHistory records={attendance} />;
      case 'leave': return <LeaveManagement requests={leaveRequests} onSubmit={(request) => { setLeaveRequests((current) => [request, ...current]); showToast('Leave request submitted'); }} />;
      case 'profile': return <ProfileScreen role="employee" onLogout={logout} />;
      default: return <EmployeeDashboard onCapture={setCaptureKind} />;
    }
  }, [activeView, attendance, leaveRequests]);

  const adminView = useMemo(() => {
    switch (activeView as AdminView) {
      case 'employees': return <AdminEmployees />;
      case 'records': return <AdminRecords />;
      case 'approvals': return <AdminApprovals requests={leaveRequests} onDecision={(id, status) => { setLeaveRequests((current) => current.map((request) => request.id === id ? { ...request, status } : request)); showToast(`Leave request ${status.toLowerCase()}`); }} />;
      case 'profile': return <ProfileScreen role="admin" onLogout={logout} />;
      default: return <AdminOverview onNavigate={setActiveView} />;
    }
  }, [activeView, leaveRequests]);

  if (!role) return <LoginScreen onLogin={login} />;
  if (confirmation) return <ConfirmationScreen {...confirmation} onSubmit={submitAttendance} onRetake={() => { setConfirmation(null); setCaptureKind(confirmation.kind); }} />;

  const tabs = role === 'admin' ? adminTabs : employeeTabs;
  return (
    <View style={styles.appRoot}>
      <StatusBar style="dark" />
      <View style={styles.appContent}>{role === 'admin' && activeView === 'overview' ? <View style={styles.adminTopMenu}><Pressable testID="button-open-menu" onPress={() => setDrawerOpen(true)} style={styles.iconButton}><Icon name="menu" size={22} color={theme.foreground} /></Pressable><Logo /><Pressable onPress={() => setActiveView('profile')} style={styles.avatarSmall}><Text style={styles.avatarSmallText}>SK</Text></Pressable></View> : role === 'admin' ? <View style={styles.adminTopMenu}><Pressable testID="button-open-menu" onPress={() => setDrawerOpen(true)} style={styles.iconButton}><Icon name="menu" size={22} color={theme.foreground} /></Pressable><Text style={styles.appBarTitle}>{tabs.find((tab) => tab.key === activeView)?.label}</Text><View style={{ width: 40 }} /></View> : null}{role === 'admin' ? adminView : employeeView}</View>
      <View style={[styles.bottomNav, { paddingBottom: Platform.OS === 'web' ? 34 : 8 }]}>{(role === 'employee' ? employeeTabs : adminTabs.slice(0, 4)).map((tab) => <Pressable key={tab.key} testID={`tab-${tab.key}`} onPress={() => setActiveView(tab.key)} style={styles.bottomNavItem}><Icon name={tab.icon} size={20} color={activeView === tab.key ? theme.primary : theme.slate} /><Text style={[styles.bottomNavLabel, activeView === tab.key && styles.bottomNavLabelActive]}>{tab.label}</Text>{activeView === tab.key ? <View style={styles.bottomNavActiveDot} /> : null}</Pressable>)}<Pressable testID="tab-menu" onPress={() => role === 'admin' ? setDrawerOpen(true) : setActiveView('profile')} style={styles.bottomNavItem}><Icon name={role === 'admin' ? 'menu' : 'user'} size={20} color={role === 'employee' && activeView === 'profile' ? theme.primary : theme.slate} /><Text style={[styles.bottomNavLabel, role === 'employee' && activeView === 'profile' && styles.bottomNavLabelActive]}>{role === 'admin' ? 'More' : 'Profile'}</Text></Pressable></View>
      {drawerOpen ? <Drawer role={role} activeView={activeView} onNavigate={navigate} onClose={() => setDrawerOpen(false)} onLogout={logout} /> : null}
      {toast ? <Toast message={toast} onDismiss={() => setToast('')} /> : null}
      {captureKind ? <CameraCapture kind={captureKind} onComplete={handleCaptureComplete} onCancel={() => setCaptureKind(null)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  appRoot: { flex: 1, backgroundColor: theme.background },
  appContent: { flex: 1 },
  screen: { flex: 1, backgroundColor: theme.background },
  screenContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 112 },
  topHeader: { minHeight: 68, flexDirection: 'row', alignItems: 'center', gap: 12 },
  headerTextBlock: { flex: 1 },
  eyebrow: { color: theme.slate, fontSize: 10, fontFamily: 'Inter_700Bold', letterSpacing: 1.25, marginBottom: 5 },
  headerTitle: { color: theme.foreground, fontSize: 24, fontFamily: 'Inter_700Bold', letterSpacing: -0.5 },
  iconButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20 },
  avatarSmall: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.navy },
  avatarSmallText: { color: theme.card, fontFamily: 'Inter_700Bold', fontSize: 12 },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  logoMark: { width: 31, height: 31, borderRadius: 10, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  logoMarkInverse: { backgroundColor: theme.cyan },
  logoTitle: { color: theme.navy, fontSize: 13, fontFamily: 'Inter_700Bold', letterSpacing: 1.3 },
  logoSubtitle: { color: theme.slate, fontSize: 7, fontFamily: 'Inter_600SemiBold', letterSpacing: 2.1, marginTop: 1 },
  inverseText: { color: theme.card },
  inverseMuted: { color: '#B1C9E8' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
  button: { height: 54, borderRadius: 15, backgroundColor: theme.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 18, shadowColor: theme.primary, shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 3 },
  buttonSecondary: { backgroundColor: theme.secondary, shadowOpacity: 0 },
  buttonGhost: { backgroundColor: 'transparent', shadowOpacity: 0 },
  buttonDanger: { backgroundColor: '#FCE7E8', shadowOpacity: 0 },
  buttonDisabled: { opacity: 0.5 },
  buttonCompact: { height: 40, borderRadius: 11, paddingHorizontal: 14, marginTop: 0, flex: 1 },
  buttonText: { color: theme.card, fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  buttonTextSecondary: { color: theme.primary },
  buttonTextCompact: { fontSize: 13 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 5, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 20 },
  statusSuccess: { backgroundColor: '#E2F5EF' },
  statusWarning: { backgroundColor: '#FFF2D9' },
  statusDanger: { backgroundColor: '#FCE6E8' },
  statusNeutral: { backgroundColor: '#EEF1F5' },
  statusSuccessText: { backgroundColor: theme.success, color: theme.success },
  statusWarningText: { backgroundColor: theme.warning, color: theme.warning },
  statusDangerText: { backgroundColor: theme.destructive, color: theme.destructive },
  statusNeutralText: { backgroundColor: theme.slate, color: theme.slate },
  statusDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: theme.success },
  statusText: { color: theme.success, fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  dashboardGreeting: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  greetingTitle: { color: theme.foreground, fontSize: 21, fontFamily: 'Inter_700Bold', letterSpacing: -0.45 },
  greetingSub: { color: theme.slate, fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 5 },
  avatarLarge: { width: 52, height: 52, borderRadius: 18, backgroundColor: '#DDE7FA', alignItems: 'center', justifyContent: 'center' },
  avatarLargeText: { color: theme.primary, fontSize: 15, fontFamily: 'Inter_700Bold' },
  attendanceHero: { borderRadius: 22, padding: 20, marginBottom: 25, minHeight: 177 },
  heroTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heroLabel: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  heroLiveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: theme.cyan },
  heroLabelText: { color: '#B7CBE4', fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.1 },
  heroTime: { color: theme.card, fontFamily: 'Inter_700Bold', fontSize: 42, letterSpacing: -1.6, marginTop: 17 },
  heroAm: { color: theme.cyan, fontSize: 16, letterSpacing: 0 },
  heroBottomRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: 7 },
  heroMuted: { color: '#AFC4DF', fontFamily: 'Inter_400Regular', fontSize: 11 },
  heroLocation: { color: theme.card, fontFamily: 'Inter_500Medium', fontSize: 13, marginTop: 3 },
  heroStatus: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(55,200,193,0.14)', paddingHorizontal: 9, paddingVertical: 6, borderRadius: 12 },
  heroStatusText: { color: theme.cyan, fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  sectionTitle: { color: theme.foreground, fontFamily: 'Inter_700Bold', fontSize: 16, letterSpacing: -0.2 },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 25, marginBottom: 12 },
  linkText: { color: theme.primary, fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  actionRow: { flexDirection: 'row', gap: 12, marginTop: 13 },
  attendanceAction: { flex: 1, height: 145, borderRadius: 19, padding: 16, position: 'relative' },
  checkInAction: { backgroundColor: theme.primary },
  checkOutAction: { backgroundColor: theme.secondary },
  actionIcon: { width: 40, height: 40, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.17)', alignItems: 'center', justifyContent: 'center' },
  actionIconDark: { backgroundColor: theme.card },
  attendanceActionTitle: { color: theme.card, fontFamily: 'Inter_700Bold', fontSize: 17, marginTop: 18 },
  attendanceActionSub: { color: '#C4D7F4', fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3 },
  actionArrow: { position: 'absolute', right: 15, top: 17 },
  darkActionText: { color: theme.navy },
  darkActionSub: { color: theme.slate },
  weekCard: { backgroundColor: theme.card, borderRadius: 19, borderWidth: 1, borderColor: theme.border, padding: 17 },
  weekSummary: { flexDirection: 'row', alignItems: 'center' },
  weekNumber: { color: theme.foreground, fontFamily: 'Inter_700Bold', fontSize: 22 },
  weekLabel: { color: theme.slate, fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 2 },
  weekDivider: { width: 1, height: 36, backgroundColor: theme.border, marginHorizontal: 25 },
  weekRing: { marginLeft: 'auto', width: 49, height: 49, borderRadius: 25, borderWidth: 5, borderColor: theme.cyan, alignItems: 'center', justifyContent: 'center' },
  weekRingText: { color: theme.primary, fontFamily: 'Inter_700Bold', fontSize: 11 },
  weekDays: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 },
  dayColumn: { alignItems: 'center', gap: 7 },
  dayDot: { width: 25, height: 25, borderRadius: 13, backgroundColor: theme.muted, alignItems: 'center', justifyContent: 'center' },
  dayDotActive: { backgroundColor: '#E0F5EE' },
  dayDotToday: { backgroundColor: theme.secondary, borderWidth: 1, borderColor: theme.primary },
  dayDotText: { color: theme.slate, fontSize: 12 },
  dayDotTextActive: { color: theme.success, fontFamily: 'Inter_700Bold' },
  dayLabel: { color: theme.slate, fontSize: 10, fontFamily: 'Inter_600SemiBold' },
  dayLabelToday: { color: theme.primary },
  noticeCard: { flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: theme.secondary, borderRadius: 15, padding: 13, marginTop: 13 },
  noticeIcon: { width: 32, height: 32, borderRadius: 11, backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center' },
  noticeCopy: { flex: 1 },
  noticeTitle: { color: theme.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  noticeSub: { color: theme.slate, fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 2 },
  historySummary: { backgroundColor: theme.navy, borderRadius: 19, padding: 19, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 13 },
  summaryEyebrow: { color: '#B5C9E3', fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.1 },
  summaryTitle: { color: theme.card, fontFamily: 'Inter_700Bold', fontSize: 22, marginTop: 10 },
  summarySub: { color: '#B5C9E3', fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 4 },
  summaryCircle: { width: 67, height: 67, borderRadius: 34, borderWidth: 6, borderColor: theme.cyan, alignItems: 'center', justifyContent: 'center' },
  summaryCircleText: { color: theme.card, fontFamily: 'Inter_700Bold', fontSize: 18 },
  summaryCircleLabel: { color: '#B5C9E3', fontFamily: 'Inter_400Regular', fontSize: 9, marginTop: -1 },
  filterRow: { flexDirection: 'row', gap: 9, marginTop: 17, marginBottom: 4 },
  filterPill: { minHeight: 36, borderRadius: 11, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 7 },
  filterPillText: { color: theme.primary, fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  filterIcon: { width: 36, height: 36, borderRadius: 11, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card, alignItems: 'center', justifyContent: 'center' },
  recordRow: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 15, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11, marginBottom: 9 },
  recordThumb: { width: 42, height: 42, borderRadius: 13, backgroundColor: theme.muted },
  recordMain: { flex: 1 },
  recordTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  recordKind: { color: theme.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  recordDate: { color: theme.slate, fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 4 },
  recordLocation: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 5 },
  recordLocationText: { color: theme.slate, fontFamily: 'Inter_400Regular', fontSize: 10 },
  endList: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 13 },
  endListLine: { flex: 1, height: 1, backgroundColor: theme.border },
  endListText: { color: theme.slate, fontFamily: 'Inter_400Regular', fontSize: 10 },
  leaveHero: { backgroundColor: theme.navy, borderRadius: 21, padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 13, overflow: 'hidden' },
  leaveHeroEyebrow: { color: theme.cyan, fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.1 },
  leaveHeroTitle: { color: theme.card, fontFamily: 'Inter_700Bold', fontSize: 21, marginTop: 9 },
  leaveHeroSub: { color: '#B5C9E3', fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 5, maxWidth: 205 },
  balanceRow: { flexDirection: 'row', backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 18, padding: 14, marginTop: 12, marginBottom: 17 },
  balanceItem: { flex: 1, paddingHorizontal: 5 },
  balanceNumber: { color: theme.foreground, fontFamily: 'Inter_700Bold', fontSize: 21 },
  balanceLabel: { color: theme.slate, fontFamily: 'Inter_400Regular', fontSize: 9, marginTop: 2 },
  balanceBar: { height: 4, borderRadius: 2, backgroundColor: theme.muted, marginTop: 9, overflow: 'hidden' },
  balanceBarFill: { height: 4, borderRadius: 2, backgroundColor: theme.primary },
  balanceBarTeal: { backgroundColor: theme.success },
  balanceBarGold: { backgroundColor: theme.warning },
  leaveRow: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 15, padding: 12, flexDirection: 'row', gap: 11, alignItems: 'center', marginBottom: 9 },
  leaveDateBox: { width: 43, height: 48, borderRadius: 12, backgroundColor: theme.secondary, alignItems: 'center', justifyContent: 'center' },
  leaveDateMonth: { color: theme.primary, fontFamily: 'Inter_700Bold', fontSize: 9, textTransform: 'uppercase' },
  leaveDateDay: { color: theme.primary, fontFamily: 'Inter_700Bold', fontSize: 17, marginTop: 1 },
  leaveMain: { flex: 1 },
  leaveReason: { color: theme.foreground, fontFamily: 'Inter_500Medium', fontSize: 10, marginTop: 5 },
  formHeader: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 8 },
  formIntro: { color: theme.slate, fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, marginTop: 8, marginBottom: 24 },
  formGroup: { marginTop: 17 },
  inputLabel: { color: theme.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 12, marginBottom: 8 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  forgotText: { color: theme.primary, fontFamily: 'Inter_600SemiBold', fontSize: 11 },
  inputWrap: { minHeight: 50, borderRadius: 13, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 10 },
  input: { color: theme.foreground, flex: 1, fontFamily: 'Inter_400Regular', fontSize: 13, minHeight: 48 },
  inputStandalone: { color: theme.foreground, borderRadius: 13, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.card, paddingHorizontal: 13, fontFamily: 'Inter_400Regular', fontSize: 13 },
  textArea: { minHeight: 112, paddingTop: 13, textAlignVertical: 'top', marginBottom: 17 },
  optionalText: { color: theme.slate, fontFamily: 'Inter_400Regular' },
  segmentRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  segment: { flex: 1, height: 43, borderRadius: 12, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: theme.secondary, borderColor: theme.primary },
  segmentText: { color: theme.slate, fontFamily: 'Inter_500Medium', fontSize: 12 },
  segmentTextActive: { color: theme.primary, fontFamily: 'Inter_700Bold' },
  dateRow: { flexDirection: 'row', gap: 9 },
  dateField: { flex: 1 },
  attachmentBox: { minHeight: 52, borderRadius: 13, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.primary, backgroundColor: theme.secondary, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 9 },
  attachmentText: { color: theme.primary, fontFamily: 'Inter_500Medium', fontSize: 12, flex: 1 },
  errorText: { color: theme.destructive, fontFamily: 'Inter_500Medium', fontSize: 12, marginTop: 10 },
  profileHero: { alignItems: 'center', backgroundColor: theme.card, borderRadius: 20, borderWidth: 1, borderColor: theme.border, paddingVertical: 25, marginTop: 13 },
  profileAvatar: { width: 83, height: 83, borderRadius: 29, backgroundColor: '#DDE7FA', alignItems: 'center', justifyContent: 'center', position: 'relative' },
  profileAvatarText: { color: theme.primary, fontFamily: 'Inter_700Bold', fontSize: 23 },
  profileOnline: { position: 'absolute', width: 15, height: 15, borderRadius: 8, backgroundColor: theme.success, borderWidth: 3, borderColor: theme.card, right: -1, bottom: 5 },
  profileName: { color: theme.foreground, fontFamily: 'Inter_700Bold', fontSize: 21, marginTop: 13 },
  profileRole: { color: theme.slate, fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 4 },
  profileSite: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 10, backgroundColor: theme.secondary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 15 },
  profileSiteText: { color: theme.primary, fontFamily: 'Inter_500Medium', fontSize: 10 },
  profileDetails: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 18, padding: 5, marginTop: 12, marginBottom: 18 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 13, borderBottomWidth: 1, borderBottomColor: theme.border },
  detailIcon: { width: 33, height: 33, borderRadius: 11, backgroundColor: theme.secondary, alignItems: 'center', justifyContent: 'center' },
  detailLabel: { color: theme.slate, fontFamily: 'Inter_400Regular', fontSize: 10 },
  detailValue: { color: theme.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 12, marginTop: 4 },
  accountStatus: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  accountStatusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.success },
  accountStatusText: { color: theme.success, fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  versionText: { color: theme.slate, fontFamily: 'Inter_400Regular', fontSize: 10, textAlign: 'center', marginTop: 22 },
  adminTopMenu: { minHeight: 69, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.background },
  appBarTitle: { color: theme.foreground, fontFamily: 'Inter_700Bold', fontSize: 17 },
  adminWelcome: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  avatarLargeAdmin: { width: 44, height: 44, borderRadius: 15, backgroundColor: '#EDE6FF', alignItems: 'center', justifyContent: 'center' },
  adminGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  adminMetric: { width: '48.2%', minHeight: 131, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 17, padding: 13 },
  metricIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  metricBlue: { backgroundColor: theme.secondary },
  metricTeal: { backgroundColor: '#E1F5EF' },
  metricGold: { backgroundColor: '#FFF1D8' },
  metricRed: { backgroundColor: '#FCE7E8' },
  metricNumber: { color: theme.foreground, fontFamily: 'Inter_700Bold', fontSize: 25, marginTop: 9 },
  metricLabel: { color: theme.slate, fontFamily: 'Inter_500Medium', fontSize: 10, marginTop: 1 },
  metricTrend: { color: theme.success, fontFamily: 'Inter_500Medium', fontSize: 9, marginTop: 8 },
  metricTrendRed: { color: theme.destructive, fontFamily: 'Inter_500Medium', fontSize: 9, marginTop: 8 },
  adminChartCard: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 18, padding: 15, marginTop: 18 },
  cardSub: { color: theme.slate, fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 3 },
  chartFilter: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 9, backgroundColor: theme.muted },
  chartFilterText: { color: theme.slate, fontFamily: 'Inter_500Medium', fontSize: 10 },
  chart: { flexDirection: 'row', height: 145, marginTop: 15 },
  chartAxis: { justifyContent: 'space-between', paddingBottom: 20 },
  chartBars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', borderBottomWidth: 1, borderLeftWidth: 1, borderColor: theme.border, paddingLeft: 9, paddingRight: 3 },
  chartBarColumn: { height: '100%', justifyContent: 'flex-end', alignItems: 'center', gap: 6 },
  chartBar: { width: 19, borderRadius: 6, backgroundColor: theme.primary },
  chartDay: { color: theme.slate, fontFamily: 'Inter_500Medium', fontSize: 9 },
  attentionRow: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 15, marginBottom: 9 },
  attentionIcon: { width: 35, height: 35, borderRadius: 12, backgroundColor: '#FFF1D8', alignItems: 'center', justifyContent: 'center' },
  attentionIconRed: { backgroundColor: '#FCE7E8' },
  attentionCopy: { flex: 1 },
  attentionTitle: { color: theme.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  attentionSub: { color: theme.slate, fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 3 },
  directoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 14 },
  directoryFilters: { flexDirection: 'row', gap: 8, marginVertical: 12 },
  employeeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 15, padding: 11, marginBottom: 9 },
  employeeAvatar: { width: 41, height: 41, borderRadius: 14, backgroundColor: '#E6ECFF', alignItems: 'center', justifyContent: 'center' },
  employeeAvatarText: { color: theme.primary, fontFamily: 'Inter_700Bold', fontSize: 11 },
  employeeMain: { flex: 1 },
  employeeName: { color: theme.foreground, fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  employeeRole: { color: theme.slate, fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 3 },
  employeeSite: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 5 },
  employeeSiteText: { color: theme.slate, fontFamily: 'Inter_400Regular', fontSize: 9 },
  employeeStatus: { alignItems: 'flex-end', justifyContent: 'space-between', gap: 11 },
  emptyState: { alignItems: 'center', justifyContent: 'center', padding: 45 },
  emptyIcon: { width: 48, height: 48, borderRadius: 17, backgroundColor: '#E1F5EF', alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { color: theme.foreground, fontFamily: 'Inter_700Bold', fontSize: 15, marginTop: 13 },
  emptySub: { color: theme.slate, fontFamily: 'Inter_400Regular', fontSize: 12, textAlign: 'center', marginTop: 5 },
  recordsHero: { backgroundColor: '#E7F6F1', borderRadius: 18, padding: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, marginBottom: 14 },
  recordsHeroEyebrow: { color: theme.success, fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1 },
  recordsHeroTitle: { color: theme.navy, fontFamily: 'Inter_700Bold', fontSize: 23, marginTop: 7 },
  recordsHeroSub: { color: theme.slate, fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 3 },
  recordsProgress: { width: 64, height: 64, borderRadius: 32, borderWidth: 6, borderColor: theme.success, alignItems: 'center', justifyContent: 'center' },
  recordsProgressText: { color: theme.success, fontFamily: 'Inter_700Bold', fontSize: 14 },
  liveLabel: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  liveDotBlue: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.success },
  liveLabelText: { color: theme.success, fontFamily: 'Inter_700Bold', fontSize: 9, letterSpacing: 1 },
  approvalIntro: { backgroundColor: theme.secondary, borderRadius: 18, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 15, marginTop: 13, marginBottom: 16 },
  approvalCount: { width: 62, height: 62, borderRadius: 19, backgroundColor: theme.primary, alignItems: 'center', justifyContent: 'center' },
  approvalCountNumber: { color: theme.card, fontFamily: 'Inter_700Bold', fontSize: 23 },
  approvalCountLabel: { color: '#D0DEFF', fontFamily: 'Inter_400Regular', fontSize: 8 },
  approvalIntroCopy: { color: theme.navy, fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 18, flex: 1 },
  approvalCard: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 17, padding: 13, marginBottom: 10 },
  approvalTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  approvalDetails: { flexDirection: 'row', gap: 22, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.border, paddingVertical: 13, marginTop: 13 },
  approvalButtons: { flexDirection: 'row', gap: 8, marginTop: 12 },
  toast: { position: 'absolute', left: 16, right: 16, bottom: Platform.OS === 'web' ? 96 : 86, minHeight: 51, borderRadius: 15, backgroundColor: theme.navy, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 9, shadowColor: theme.navy, shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 7 }, elevation: 8 },
  toastIcon: { width: 24, height: 24, borderRadius: 8, backgroundColor: theme.success, alignItems: 'center', justifyContent: 'center' },
  toastText: { color: theme.card, fontFamily: 'Inter_500Medium', fontSize: 12, flex: 1 },
  bottomNav: { position: 'absolute', bottom: 0, left: 0, right: 0, minHeight: 71, backgroundColor: theme.card, borderTopWidth: 1, borderTopColor: theme.border, flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-around', paddingTop: 10 },
  bottomNavItem: { alignItems: 'center', justifyContent: 'center', minWidth: 55, gap: 4 },
  bottomNavLabel: { color: theme.slate, fontFamily: 'Inter_500Medium', fontSize: 9 },
  bottomNavLabelActive: { color: theme.primary, fontFamily: 'Inter_700Bold' },
  bottomNavActiveDot: { position: 'absolute', width: 4, height: 4, borderRadius: 2, backgroundColor: theme.primary, bottom: -7 },
  drawerBackdrop: { flex: 1, flexDirection: 'row' },
  drawerScrim: { flex: 1, backgroundColor: 'rgba(16,35,63,0.45)' },
  drawer: { width: 292, backgroundColor: theme.card, paddingTop: Platform.OS === 'web' ? 67 : 49, paddingHorizontal: 17, paddingBottom: 22 },
  drawerTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  drawerIdentity: { borderBottomWidth: 1, borderBottomColor: theme.border, paddingBottom: 22, marginTop: 25 },
  drawerName: { color: theme.foreground, fontFamily: 'Inter_700Bold', fontSize: 17, marginTop: 13 },
  drawerRole: { color: theme.slate, fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 3 },
  drawerLinks: { marginTop: 17 },
  drawerLink: { minHeight: 49, borderRadius: 13, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 13, position: 'relative' },
  drawerLinkActive: { backgroundColor: theme.secondary },
  drawerLinkText: { color: theme.slate, fontFamily: 'Inter_500Medium', fontSize: 13 },
  drawerLinkTextActive: { color: theme.primary, fontFamily: 'Inter_700Bold' },
  drawerActiveBar: { position: 'absolute', right: 0, width: 3, height: 22, backgroundColor: theme.primary, borderRadius: 3 },
  drawerLogout: { borderTopWidth: 1, borderTopColor: theme.border, marginTop: 'auto', paddingTop: 18, flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 13 },
  drawerLogoutText: { color: theme.destructive, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  loginBackground: { flex: 1, backgroundColor: theme.background },
  loginHero: { minHeight: 360, paddingHorizontal: 24, overflow: 'hidden' },
  loginHeroCopy: { marginTop: 45, maxWidth: 340 },
  livePill: { alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: 'rgba(55,200,193,0.42)', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: 'rgba(55,200,193,0.1)' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.cyan },
  livePillText: { color: theme.cyan, fontFamily: 'Inter_700Bold', fontSize: 8, letterSpacing: 1 },
  loginTitle: { color: theme.card, fontFamily: 'Inter_700Bold', fontSize: 34, lineHeight: 39, letterSpacing: -1.1, marginTop: 18 },
  loginDescription: { color: '#B4C8E3', fontFamily: 'Inter_400Regular', fontSize: 13, lineHeight: 20, marginTop: 15, maxWidth: 305 },
  heroGeometry: { position: 'absolute', right: -20, bottom: -35, width: 180, height: 150, opacity: 0.45 },
  geometryLine: { position: 'absolute', width: 210, height: 1, backgroundColor: theme.cyan, transform: [{ rotate: '-32deg' }], top: 70 },
  geometryBlock: { position: 'absolute', right: 43, top: 36, width: 72, height: 72, borderRadius: 22, borderWidth: 1, borderColor: theme.cyan, alignItems: 'center', justifyContent: 'center', transform: [{ rotate: '14deg' }] },
  loginSheet: { flex: 1, marginTop: -17, borderTopLeftRadius: 25, borderTopRightRadius: 25, backgroundColor: theme.background, paddingHorizontal: 24, paddingTop: 3 },
  loginSheetHandle: { alignSelf: 'center', width: 39, height: 4, borderRadius: 2, backgroundColor: theme.border, marginVertical: 14 },
  formEyebrow: { color: theme.primary, fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 1.3 },
  loginSheetTitle: { color: theme.foreground, fontFamily: 'Inter_700Bold', fontSize: 22, letterSpacing: -0.5, marginTop: 8 },
  loginSheetSubtitle: { color: theme.slate, fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18, marginTop: 6, marginBottom: 12 },
  loginHint: { backgroundColor: theme.secondary, borderRadius: 12, padding: 11, flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 14 },
  loginHintText: { color: theme.primary, fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15, flex: 1 },
  loginFooter: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 25 },
  footerRule: { height: 1, backgroundColor: theme.border, flex: 1 },
  footerText: { color: theme.slate, fontFamily: 'Inter_400Regular', fontSize: 9 },
  confirmationScreen: { flex: 1, backgroundColor: theme.background },
  confirmationTop: { paddingTop: Platform.OS === 'web' ? 67 : 48, paddingHorizontal: 20, paddingBottom: 28, alignItems: 'center' },
  confirmationHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' },
  confirmationHeaderTitle: { color: theme.card, fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  confirmPhotoWrap: { position: 'relative', marginTop: 25 },
  confirmPhoto: { width: 142, height: 142, borderRadius: 48, borderWidth: 5, borderColor: 'rgba(255,255,255,0.25)' },
  photoCheck: { width: 28, height: 28, borderRadius: 14, backgroundColor: theme.success, alignItems: 'center', justifyContent: 'center', position: 'absolute', right: -2, bottom: 8, borderWidth: 3, borderColor: theme.navy },
  confirmTitle: { color: theme.card, fontFamily: 'Inter_700Bold', fontSize: 25, marginTop: 16 },
  confirmSub: { color: '#B5C9E3', fontFamily: 'Inter_400Regular', fontSize: 12, marginTop: 5 },
  confirmationDetails: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  confirmDetailsCard: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.border, borderRadius: 18, padding: 5 },
  confirmDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 12, borderBottomWidth: 1, borderBottomColor: theme.border },
  confirmDetailIcon: { width: 33, height: 33, borderRadius: 11, backgroundColor: theme.secondary, alignItems: 'center', justifyContent: 'center' },
  confirmPrivacy: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 14, backgroundColor: '#E4F6F0', borderRadius: 13, marginTop: 12 },
  confirmPrivacyText: { color: theme.success, fontFamily: 'Inter_400Regular', fontSize: 10, lineHeight: 15, flex: 1 },
  retakeButton: { alignItems: 'center', justifyContent: 'center', height: 44, marginTop: 9 },
  retakeText: { color: theme.primary, fontFamily: 'Inter_600SemiBold', fontSize: 13 },
  cameraScreen: { flex: 1, backgroundColor: theme.navy },
  cameraWebFallback: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.navy },
  cameraFallbackTitle: { color: theme.card, fontFamily: 'Inter_700Bold', fontSize: 21, marginTop: 15 },
  cameraFallbackSub: { color: '#B5C9E3', fontFamily: 'Inter_400Regular', fontSize: 12, textAlign: 'center', maxWidth: 250, lineHeight: 18, marginTop: 6 },
  cameraOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, paddingTop: Platform.OS === 'web' ? 67 : 48, paddingHorizontal: 20, paddingBottom: 35, justifyContent: 'space-between' },
  cameraHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cameraClose: { width: 42, height: 42, borderRadius: 15, backgroundColor: 'rgba(0,0,0,0.27)', alignItems: 'center', justifyContent: 'center' },
  cameraTitle: { color: theme.card, fontFamily: 'Inter_700Bold', fontSize: 16, textAlign: 'center' },
  cameraSubtitle: { color: '#C2D2E6', fontFamily: 'Inter_400Regular', fontSize: 10, marginTop: 3 },
  cameraStep: { paddingHorizontal: 9, paddingVertical: 7, borderRadius: 10, backgroundColor: 'rgba(0,0,0,0.27)' },
  cameraStepText: { color: theme.card, fontFamily: 'Inter_600SemiBold', fontSize: 10 },
  cameraGuide: { alignSelf: 'center', width: 215, height: 255, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  guideCorner: { width: 30, height: 30, borderColor: theme.cyan, position: 'absolute' },
  guideTopLeft: { left: 0, top: 0, borderLeftWidth: 2, borderTopWidth: 2, borderTopLeftRadius: 8 },
  guideTopRight: { right: 0, top: 0, borderRightWidth: 2, borderTopWidth: 2, borderTopRightRadius: 8 },
  guideBottomLeft: { left: 0, bottom: 0, borderLeftWidth: 2, borderBottomWidth: 2, borderBottomLeftRadius: 8 },
  guideBottomRight: { right: 0, bottom: 0, borderRightWidth: 2, borderBottomWidth: 2, borderBottomRightRadius: 8 },
  cameraBottom: { alignItems: 'center' },
  cameraHint: { color: '#D0DEEF', fontFamily: 'Inter_400Regular', fontSize: 11, marginBottom: 18 },
  shutter: { width: 77, height: 77, borderRadius: 39, backgroundColor: 'rgba(255,255,255,0.26)', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: theme.card },
  shutterInner: { width: 59, height: 59, borderRadius: 30, backgroundColor: theme.cyan, alignItems: 'center', justifyContent: 'center' },
  cameraBottomLabel: { color: '#D0DEEF', fontFamily: 'Inter_500Medium', fontSize: 10, marginTop: 10 },
  cameraError: { position: 'absolute', bottom: 50, left: 20, right: 20, padding: 15, backgroundColor: theme.card, borderRadius: 15 },
  cameraErrorText: { color: theme.destructive, fontFamily: 'Inter_500Medium', fontSize: 12, lineHeight: 17, marginBottom: 10 },
});