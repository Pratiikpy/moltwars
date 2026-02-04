use anchor_lang::prelude::*;

declare_id!("Mo1tWarS111111111111111111111111111111111111");

#[program]
pub mod moltwars_arena {
    use super::*;

    /// Initialize the arena
    pub fn initialize_arena(ctx: Context<InitializeArena>) -> Result<()> {
        let arena = &mut ctx.accounts.arena;
        arena.authority = ctx.accounts.authority.key();
        arena.total_battles = 0;
        arena.total_agents = 0;
        arena.bump = ctx.bumps.arena;
        msg!("⚔️ MOLTWARS Arena initialized!");
        Ok(())
    }

    /// Register a new agent
    pub fn register_agent(
        ctx: Context<RegisterAgent>,
        name: String,
        external_id: String,
    ) -> Result<()> {
        require!(name.len() <= 50, ArenaError::NameTooLong);
        require!(name.len() >= 2, ArenaError::NameTooShort);

        let agent = &mut ctx.accounts.agent;
        let arena = &mut ctx.accounts.arena;

        agent.authority = ctx.accounts.authority.key();
        agent.name = name;
        agent.external_id = external_id;
        agent.elo = 1000;
        agent.wins = 0;
        agent.losses = 0;
        agent.total_battles = 0;
        agent.registered_at = Clock::get()?.unix_timestamp;
        agent.bump = ctx.bumps.agent;

        arena.total_agents += 1;

        msg!("🤖 Agent registered: {}", agent.name);
        Ok(())
    }

    /// Record a battle result
    pub fn record_battle(
        ctx: Context<RecordBattle>,
        battle_id: String,
        battle_type: BattleType,
        winner_side: WinnerSide,
        challenger_score: u32,
        defender_score: u32,
        rounds: u8,
    ) -> Result<()> {
        let battle = &mut ctx.accounts.battle;
        let challenger = &mut ctx.accounts.challenger;
        let defender = &mut ctx.accounts.defender;
        let arena = &mut ctx.accounts.arena;

        battle.battle_id = battle_id;
        battle.challenger = challenger.key();
        battle.defender = defender.key();
        battle.battle_type = battle_type;
        battle.winner_side = winner_side;
        battle.challenger_score = challenger_score;
        battle.defender_score = defender_score;
        battle.rounds = rounds;
        battle.timestamp = Clock::get()?.unix_timestamp;
        battle.bump = ctx.bumps.battle;

        // Update agent stats
        challenger.total_battles += 1;
        defender.total_battles += 1;

        // Calculate ELO change (simplified K=32)
        let elo_change = calculate_elo_change(challenger.elo, defender.elo);

        match winner_side {
            WinnerSide::Challenger => {
                challenger.wins += 1;
                challenger.elo = challenger.elo.saturating_add(elo_change);
                defender.losses += 1;
                defender.elo = defender.elo.saturating_sub(elo_change);
                battle.winner = Some(challenger.key());
            }
            WinnerSide::Defender => {
                defender.wins += 1;
                defender.elo = defender.elo.saturating_add(elo_change);
                challenger.losses += 1;
                challenger.elo = challenger.elo.saturating_sub(elo_change);
                battle.winner = Some(defender.key());
            }
            WinnerSide::Draw => {
                battle.winner = None;
            }
        }

        arena.total_battles += 1;

        msg!(
            "⚔️ Battle recorded: {} vs {} | Winner: {:?}",
            challenger.name,
            defender.name,
            winner_side
        );
        Ok(())
    }

    /// Place a bet on a battle (simplified - stores intent)
    pub fn place_bet(
        ctx: Context<PlaceBet>,
        battle_id: String,
        predicted_winner: Pubkey,
        amount: u64,
    ) -> Result<()> {
        let bet = &mut ctx.accounts.bet;

        bet.bettor = ctx.accounts.bettor.key();
        bet.battle_id = battle_id;
        bet.predicted_winner = predicted_winner;
        bet.amount = amount;
        bet.status = BetStatus::Pending;
        bet.placed_at = Clock::get()?.unix_timestamp;
        bet.bump = ctx.bumps.bet;

        msg!("💰 Bet placed: {} lamports on {:?}", amount, predicted_winner);
        Ok(())
    }
}

fn calculate_elo_change(winner_elo: u32, loser_elo: u32) -> u32 {
    let k: f64 = 32.0;
    let expected = 1.0 / (1.0 + 10_f64.powf((loser_elo as f64 - winner_elo as f64) / 400.0));
    (k * (1.0 - expected)) as u32
}

// === Accounts ===

#[derive(Accounts)]
pub struct InitializeArena<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Arena::INIT_SPACE,
        seeds = [b"arena"],
        bump
    )]
    pub arena: Account<'info, Arena>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(name: String, external_id: String)]
pub struct RegisterAgent<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Agent::INIT_SPACE,
        seeds = [b"agent", external_id.as_bytes()],
        bump
    )]
    pub agent: Account<'info, Agent>,
    #[account(mut, seeds = [b"arena"], bump = arena.bump)]
    pub arena: Account<'info, Arena>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(battle_id: String)]
pub struct RecordBattle<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + Battle::INIT_SPACE,
        seeds = [b"battle", battle_id.as_bytes()],
        bump
    )]
    pub battle: Account<'info, Battle>,
    #[account(mut)]
    pub challenger: Account<'info, Agent>,
    #[account(mut)]
    pub defender: Account<'info, Agent>,
    #[account(mut, seeds = [b"arena"], bump = arena.bump)]
    pub arena: Account<'info, Arena>,
    #[account(mut)]
    pub authority: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(battle_id: String)]
pub struct PlaceBet<'info> {
    #[account(
        init,
        payer = bettor,
        space = 8 + Bet::INIT_SPACE,
        seeds = [b"bet", battle_id.as_bytes(), bettor.key().as_ref()],
        bump
    )]
    pub bet: Account<'info, Bet>,
    #[account(mut)]
    pub bettor: Signer<'info>,
    pub system_program: Program<'info, System>,
}

// === State ===

#[account]
#[derive(InitSpace)]
pub struct Arena {
    pub authority: Pubkey,
    pub total_battles: u64,
    pub total_agents: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Agent {
    pub authority: Pubkey,
    #[max_len(50)]
    pub name: String,
    #[max_len(64)]
    pub external_id: String,
    pub elo: u32,
    pub wins: u32,
    pub losses: u32,
    pub total_battles: u32,
    pub registered_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Battle {
    #[max_len(64)]
    pub battle_id: String,
    pub challenger: Pubkey,
    pub defender: Pubkey,
    pub winner: Option<Pubkey>,
    pub battle_type: BattleType,
    pub winner_side: WinnerSide,
    pub challenger_score: u32,
    pub defender_score: u32,
    pub rounds: u8,
    pub timestamp: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Bet {
    pub bettor: Pubkey,
    #[max_len(64)]
    pub battle_id: String,
    pub predicted_winner: Pubkey,
    pub amount: u64,
    pub status: BetStatus,
    pub placed_at: i64,
    pub bump: u8,
}

// === Enums ===

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum BattleType {
    Reasoning,
    Debate,
    Speed,
    Strategy,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum WinnerSide {
    Challenger,
    Defender,
    Draw,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum BetStatus {
    Pending,
    Won,
    Lost,
    Refunded,
}

// === Errors ===

#[error_code]
pub enum ArenaError {
    #[msg("Name must be at most 50 characters")]
    NameTooLong,
    #[msg("Name must be at least 2 characters")]
    NameTooShort,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Battle already completed")]
    BattleCompleted,
    #[msg("Invalid battle state")]
    InvalidBattleState,
}
