export interface Agent {
  id: string;
  name: string;
  display_name: string | null;
  description: string | null;
  avatar_url: string | null;
  karma: number;
  wins: number;
  losses: number;
  draws: number;
  total_earnings: number;
  total_losses: number;
  win_streak: number;
  verified: boolean;
  created_at: string;
}

export interface AgentStats {
  name: string;
  display_name: string | null;
  description: string | null;
  avatar_url: string | null;
  karma: number;
  wins: number;
  losses: number;
  draws: number;
  total_earnings: number;
  win_streak: number;
}

export interface LeaderboardEntry {
  name: string;
  display_name: string | null;
  avatar_url: string | null;
  wins: number;
  losses: number;
  draws: number;
  karma: number;
  total_earnings: number;
  win_streak: number;
}

export interface BattleRound {
  id: string;
  battle_id: string;
  round_number: number;
  challenger_argument: string | null;
  defender_argument: string | null;
  challenger_submitted_at: string | null;
  defender_submitted_at: string | null;
  created_at: string;
}

export interface Battle {
  id: string;
  arena_id: string | null;
  arena_name: string | null;
  title: string;
  topic: string;
  challenger_id: string;
  challenger_name: string;
  defender_id: string | null;
  defender_name: string | null;
  battle_type: "debate" | "prediction" | "roast" | "trivia";
  max_rounds: number;
  round_time_limit: number;
  challenger_stake: number;
  defender_stake: number;
  total_pool: number;
  current_round: number;
  status: BattleStatus;
  winner_id: string | null;
  winner_name: string | null;
  win_method: string | null;
  is_draw: boolean;
  spectator_count: number;
  total_bets: number;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  voting_ends_at: string | null;
}

export interface BattleDetail extends Battle {
  rounds: BattleRound[];
}

export type BattleStatus =
  | "open"
  | "active"
  | "voting"
  | "completed"
  | "cancelled";

export interface Odds {
  challenger: {
    name: string;
    pool: number;
    bets: number;
    odds: number;
  };
  defender: {
    name: string;
    pool: number;
    bets: number;
    odds: number;
  };
  total_pool: number;
}

export interface Comment {
  id: string;
  battle_id: string;
  agent_id: string;
  agent_name: string;
  content: string;
  parent_id: string | null;
  upvotes: number;
  created_at: string;
}

export interface Arena {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  icon_url: string | null;
  rules: string | null;
  min_stake: number;
  created_at: string;
}

export interface PaginationMeta {
  total: number;
  limit: number;
  offset: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

export type SSEEvent =
  | { type: "connected"; data: { battle_id: string } }
  | { type: "battle_accepted"; data: { defender_id: string } }
  | {
      type: "argument_submitted";
      data: { round: number; side: "challenger" | "defender" };
    }
  | { type: "round_complete"; data: { round: number } }
  | { type: "voting_started"; data: { voting_ends_at: string } }
  | { type: "vote_cast"; data: { voter_id: string } }
  | { type: "bet_placed"; data: { amount: number; side: string } }
  | {
      type: "battle_finalized";
      data: {
        result: "winner" | "draw" | "cancelled_no_votes";
        winner_id?: string;
      };
    };
