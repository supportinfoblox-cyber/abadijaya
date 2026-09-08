import { MainCategory, TechnicalCategory, TicketPriority } from '@/types';

interface RuleMatchResult {
  mainCategory: MainCategory;
  technicalCategory: TechnicalCategory;
  priority: TicketPriority;
  confidence: number; // 0 - 100%
  matchedKeywords: string[];
  explanation: string;
}

interface KeywordRule<T> {
  target: T;
  keywords: string[];
  weight: number;
}

const TECHNICAL_RULES: KeywordRule<TechnicalCategory>[] = [
  {
    target: 'DNS',
    keywords: ['dns', 'domain', 'nameserver', 'nslookup', 'cname', 'a record', 'mx record', 'zone transfer', 'resolv', 'dig', 'ptr', 'reverse dns'],
    weight: 10,
  },
  {
    target: 'DHCP',
    keywords: ['dhcp', 'reserve ip', 'reserved ip', 'reservasi ip', 'fixed address', 'static ip', 'ip lease', 'scope', 'ip conflict', 'lease expiration', 'gateway', 'subnet mask', 'mac reservation'],
    weight: 10,
  },
  {
    target: 'Network',
    keywords: ['ipam', 'network', 'segment', 'ip segment', 'subnet', 'vlan', 'pool ip', 'ip pool', 'range ip', 'alokasi ip', 'switch', 'router', 'bgp', 'ospf', 'vpn', 'bandwidth', 'packet loss', 'latency', 'fiber', 'ping timeout', 'wi-fi', 'wifi', 'gateway down'],
    weight: 12,
  },
  {
    target: 'Server',
    keywords: ['server', 'cpu high', 'memory leak', 'out of memory', 'oom', 'disk space', 'kernel panic', 'reboot', 'linux', 'windows server', 'system crash', 'swap full', 'load average'],
    weight: 8,
  },
  {
    target: 'Security',
    keywords: ['security', 'breach', 'malware', 'ransomware', 'firewall', 'ddos', 'unauthorized access', 'cve', 'vulnerability', 'phishing', 'ssl expired', 'tls certificate', 'soc alert', 'brute force'],
    weight: 12,
  },
  {
    target: 'Database',
    keywords: ['database', 'db', 'postgres', 'postgresql', 'mysql', 'oracle', 'sql', 'query timeout', 'deadlock', 'replication lag', 'connection pool', 'corrupted index', 'slow query'],
    weight: 10,
  },
  {
    target: 'Infrastructure',
    keywords: ['infrastructure', 'datacenter', 'ups power', 'cooling', 'hvac', 'rack', 'pdu', 'generator', 'chassis', 'san storage', 'nas', 'vmware', 'esxi', 'hypervisor', 'aws', 'gcp'],
    weight: 8,
  },
  {
    target: 'Application',
    keywords: ['application', 'app error', '500 internal', '404', 'api failure', 'frontend crash', 'login failure', 'session expired', 'ui bug', 'microservice', 'nullpointer', 'payment gateway'],
    weight: 7,
  },
];

const MAIN_RULES: KeywordRule<MainCategory>[] = [
  {
    target: 'Incident',
    keywords: ['down', 'outage', 'broken', 'error', 'failed', 'cannot access', 'crash', 'urgent', 'alert', 'breach', 'offline', 'incident', 'timeout'],
    weight: 9,
  },
  {
    target: 'Problem',
    keywords: ['root cause', 'recurring', 'pattern', 'rca', 'investigation', 'known error', 'intermittent', 'workaround', 'problem analysis'],
    weight: 8,
  },
  {
    target: 'Change Request',
    keywords: ['change', 'upgrade', 'deploy', 'migration', 'rollout', 'patch update', 'rfp', 'configuration change', 'firmware update', 'release'],
    weight: 8,
  },
  {
    target: 'Maintenance',
    keywords: ['maintenance', 'scheduled', 'cleanup', 'preventive', 'inspection', 'backup check', 'health check', 'routine', 'renewal', 're-indexing'],
    weight: 7,
  },
  {
    target: 'Service Request',
    keywords: ['request', 'provision', 'create user', 'access request', 'grant permission', 'new account', 'new laptop', 'install software', 'password reset', 'license request'],
    weight: 8,
  },
];

const CRITICAL_KEYWORDS = ['outage', 'production down', 'security breach', 'ransomware', 'all users affected', 'catastrophic', 'data loss'];
const HIGH_KEYWORDS = ['degraded', 'critical service', 'urgent', 'high priority', 'multiple users', 'firewall alert', 'db locked'];
const LOW_KEYWORDS = ['minor', 'cosmetic', 'typo', 'documentation', 'low priority', 'request info', 'enhancement'];

export function analyzeTicketWithRuleEngine(subject: string, description: string): RuleMatchResult {
  const combinedText = `${subject || ''} ${description || ''}`
    .replace(/[\s\xa0\u200b\u200c\u200d\ufeff]+/g, ' ')
    .trim()
    .toLowerCase();
  const matchedKeywords: string[] = [];

  // 1. Evaluate Technical Category
  const techScores: Record<TechnicalCategory, number> = {
    DNS: 0,
    DHCP: 0,
    Network: 0,
    Server: 0,
    Security: 0,
    Application: 0,
    Infrastructure: 0,
    Database: 0,
  };

  for (const rule of TECHNICAL_RULES) {
    for (const kw of rule.keywords) {
      if (combinedText.includes(kw)) {
        techScores[rule.target] += rule.weight;
        if (!matchedKeywords.includes(kw)) {
          matchedKeywords.push(kw);
        }
      }
    }
  }

  let bestTech: TechnicalCategory = 'Application';
  let maxTechScore = 0;
  for (const [tech, score] of Object.entries(techScores) as [TechnicalCategory, number][]) {
    if (score > maxTechScore) {
      maxTechScore = score;
      bestTech = tech;
    }
  }

  // 2. Evaluate Main Category
  const mainScores: Record<MainCategory, number> = {
    Incident: 0,
    'Service Request': 0,
    Problem: 0,
    'Change Request': 0,
    Maintenance: 0,
  };

  for (const rule of MAIN_RULES) {
    for (const kw of rule.keywords) {
      if (combinedText.includes(kw)) {
        mainScores[rule.target] += rule.weight;
        if (!matchedKeywords.includes(kw)) {
          matchedKeywords.push(kw);
        }
      }
    }
  }

  let bestMain: MainCategory = 'Incident';
  let maxMainScore = 0;
  for (const [main, score] of Object.entries(mainScores) as [MainCategory, number][]) {
    if (score > maxMainScore) {
      maxMainScore = score;
      bestMain = main;
    }
  }

  // 3. Priority Recommendation
  let priority: TicketPriority = 'MEDIUM';
  if (CRITICAL_KEYWORDS.some(kw => combinedText.includes(kw))) {
    priority = 'CRITICAL';
  } else if (HIGH_KEYWORDS.some(kw => combinedText.includes(kw)) || bestTech === 'Security') {
    priority = 'HIGH';
  } else if (LOW_KEYWORDS.some(kw => combinedText.includes(kw)) || bestMain === 'Service Request') {
    priority = 'LOW';
  }

  // Calculate confidence score (0 to 100)
  const totalScore = maxTechScore + maxMainScore;
  let confidence = Math.min(98, Math.max(35, totalScore * 3.5));
  if (matchedKeywords.length === 0) {
    confidence = 30;
    bestMain = 'Incident';
    bestTech = 'Application';
  }

  const explanation = matchedKeywords.length > 0
    ? `Matched keywords [${matchedKeywords.slice(0, 4).join(', ')}] indicated ${bestMain} within the ${bestTech} domain.`
    : `Standard baseline classification applied (manual verification recommended).`;

  return {
    mainCategory: bestMain,
    technicalCategory: bestTech,
    priority,
    confidence: Math.round(confidence),
    matchedKeywords,
    explanation,
  };
}
