import React from 'react';

import Icon from 'common/Icon';
import MainCombatLogParser from 'Parser/Core/CombatLogParser';

import SPELLS from 'common/SPELLS';
import SpellLink from 'common/SpellLink';

import StatisticBox from 'Main/StatisticBox';
import SuggestionsTab from 'Main/SuggestionsTab';
import Tab from 'Main/Tab';
import Talents from 'Main/Talents';

import ISSUE_IMPORTANCE from 'Parser/Core/ISSUE_IMPORTANCE';

import Enemies from 'Parser/Core/Modules/Enemies';

import AlwaysBeCasting from './Modules/Features/AlwaysBeCasting';
import DamageTaken from './Modules/Features/DamageTaken';
import Pain from './Modules/Main/Pain';

import CastEfficiency from './Modules/Features/CastEfficiency';


function formatThousands(number) {
  return (Math.round(number || 0) + '').replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");
}

function formatNumber(number) {
  if (number > 1000000) {
    return `${(number / 1000000).toFixed(2)}m`;
  }
  if (number > 10000) {
    return `${Math.round(number / 1000)}k`;
  }
  return formatThousands(number);
}

function formatPercentage(percentage) {
  return (Math.round((percentage || 0) * 10000) / 100).toFixed(2);
}

function getIssueImportance(value, regular, major, higherIsWorse = false) {
  if (higherIsWorse ? value > major : value < major) {
    return ISSUE_IMPORTANCE.MAJOR;
  }
  if (higherIsWorse ? value > regular : value < regular) {
    return ISSUE_IMPORTANCE.REGULAR;
  }
  return ISSUE_IMPORTANCE.MINOR;
}

class CombatLogParser extends MainCombatLogParser {
  static specModules = {
    // Features
    alwaysBeCasting: AlwaysBeCasting,
    damageTaken: DamageTaken,
    enemies: Enemies,
    castEfficiency: CastEfficiency,
  };

  generateResults() {

    const results = super.generateResults();

    const fightDuration = this.fightDuration;

    const deadTimePercentage = this.modules.alwaysBeCasting.totalTimeWasted / fightDuration;

    const spiritBombUptime = this.modules.enemies.getBuffUptime(SPELLS.FRAILTY_SPIRIT_BOMB_DEBUFF.id);

    const spiritBombUptimePercentage = spiritBombUptime / fightDuration;

    // As soon as the information is ready to be analysed, gets it and put it in variables
    // This is done to not get the 'cannot read property of undefined' error
    if(this.modules.abilityTracker.abilities[SPELLS.SOUL_FRAGMENT.id] !== undefined)  {

        // Soul Fragments Tracker:
        this.soulFragmentsCasts = this.modules.abilityTracker.abilities[SPELLS.SOUL_FRAGMENT.id].casts;

        // Immolation Aura Trackers:
        this.immolationAuraUptime = this.selectedCombatant.getBuffUptime(SPELLS.IMMOLATION_AURA.id);
        this.immolationAuraDamage = this.modules.abilityTracker.abilities[SPELLS.IMMOLATION_AURA_FIRST_STRIKE.id].damangeEffective + this.modules.abilityTracker.abilities[SPELLS.IMMOLATION_AURA_BUFF.id].damangeEffective;

        // Empower Wards Tracker:
        this.empowerWardsUptime = this.selectedCombatant.getBuffUptime(SPELLS.EMPOWER_WARDS.id);

        // Demon Spikes Tracker:
        this.demonSpikesUptime = this.selectedCombatant.getBuffUptime(SPELLS.DEMON_SPIKES.buffId);

        // Sigil of Flame Tracker:
        this.sigilOfFlameUptime = this.modules.enemies.getBuffUptime(SPELLS.SIGIL_OF_FLAME_DEBUFF.id);
        this.sigilOfFlameDamage = this.modules.abilityTracker.abilities[SPELLS.SIGIL_OF_FLAME_DEBUFF.id].damangeEffective;
    }

    if (deadTimePercentage > 0.2) {
      results.addIssue({
        issue: `Your dead GCD time can be improved. Try to Always Be Casting (ABC).`,
        stat: `${Math.round(deadTimePercentage * 100)}% dead GCD time (<20% is recommended)`,
        icon: 'spell_mage_altertime',
        importance: getIssueImportance(deadTimePercentage, 0.35, 0.4, true),
      });
    }

    if (spiritBombUptimePercentage < 1.0 && this.selectedCombatant.hasTalent(SPELLS.SPIRIT_BOMB_TALENT.id)) {
      results.addIssue({
        issue: <span>Try to cast <SpellLink id={SPELLS.SPIRIT_BOMB_TALENT.id} /> more often. This is your core healing ability. Try to refresh it even if you have just one <SpellLink id={SPELLS.SOUL_FRAGMENT.id} /> available.</span>,
        stat: <span>{Math.round(spiritBombUptimePercentage * 100)}% <SpellLink id={SPELLS.FRAILTY_SPIRIT_BOMB_DEBUFF.id} /> debuff total uptime (100% uptime is recommended) </span>,
        icon: SPELLS.FRAILTY_SPIRIT_BOMB_DEBUFF.icon,
        importance: getIssueImportance(spiritBombUptimePercentage, 0.90, 0.80),
      });
    }

    results.statistics = [
      ...results.statistics,
      <StatisticBox
        icon={<Icon icon="class_demonhunter" alt="Damage done" />}
        value={`${formatNumber(this.modules.damageDone.total.effective / this.fightDuration * 1000)} DPS`}
        label='Damage done'
        tooltip={`The total damage done was ${formatThousands(this.modules.damageDone.total.effective)}.`}
      />,
      <StatisticBox
      icon={(
          <img
          src="/img/healing.png"
          style={{ border: 0 }}
          alt="Healing"
          />
      )}
      value={`${formatNumber(this.modules.healingDone.total.effective / this.fightDuration * 1000)} HPS`}
      label='Healing done'
      tooltip={`The total healing done was ${formatThousands(this.modules.healingDone.total.effective)}, of that ${formatThousands(this.modules.healingDone.total.absorbed)} was by absorbs.`}
      />,
      <StatisticBox
      icon={<Icon icon="spell_mage_altertime" alt="Dead GCD time" />}
      value={`${formatPercentage(deadTimePercentage)} %`}
      label='Dead GCD time'
      tooltip="Dead GCD time is available casting time not used. This can be caused by latency, cast interrupting, not casting anything (e.g. due to movement/stunned), etc."
      />,
      <StatisticBox
        icon={<Icon icon="spell_shadow_soulgem" alt="Soul Fragments Generated" />}
        value={`${formatNumber((this.soulFragmentsCasts / this.fightDuration * 1000) * 60)}`}
        label='Soul Fragments per minute'
        tooltip={`The total Soul Fragments generated was ${formatThousands(this.soulFragmentsCasts)}.`}
      />,
      <StatisticBox
        icon={<Icon icon="ability_demonhunter_immolation" alt="Immolation Aura" />}
        value={`${formatPercentage(this.immolationAuraUptime / this.fightDuration)}%`}
        label='Immolation Aura Uptime'
        tooltip={`The Immolation Aura total damage was ${formatThousands(this.immolationAuraDamage)}.<br/>The Immolation Aura total uptime was ${formatNumber(this.immolationAuraUptime / 1000)} seconds.`}
      />,
      <StatisticBox
        icon={<Icon icon="ability_demonhunter_demonspikes" alt="Demon Spikes" />}
        value={`${formatPercentage(this.demonSpikesUptime / this.fightDuration)}%`}
        label='Demon Spikes Uptime'
        tooltip={`The Demon Spikes total uptime was ${formatNumber(this.demonSpikesUptime / 1000)} seconds.`}
      />,
      <StatisticBox
        icon={<Icon icon="ability_demonhunter_empowerwards" alt="Empower Wards" />}
        value={`${formatPercentage(this.empowerWardsUptime / this.fightDuration)}%`}
        label='Empower Wards Uptime'
        tooltip={`The Empower Wards total uptime was ${formatNumber(this.empowerWardsUptime / 1000)} seconds.`}
      />,
      <StatisticBox
        icon={<Icon icon="ability_demonhunter_sigilofinquisition" alt="Sigil of Flame" />}
        value={`${formatPercentage(this.sigilOfFlameUptime / this.fightDuration)}%`}
        label='Sigil of Flame Uptime'
        tooltip={`The Sigil of Flame total damage was ${formatThousands(this.sigilOfFlameDamage)}.<br/>The Sigil of Flame total uptime was ${formatNumber(this.sigilOfFlameUptime / 1000)} seconds.`}
      />,
  ];

    results.tabs = [
      {
        title: 'Suggestions',
        url: 'suggestions',
        render: () => (
          <SuggestionsTab issues={results.issues} />
        ),
      },
      {
        title: 'Talents',
        url: 'talents',
        render: () => (
          <Tab title="Talents">
            <Talents combatant={this.selectedCombatant} />
          </Tab>
        ),
      },
      {
        title: 'Pain',
        url: 'pain',
        render: () => (
          <Tab title="Pain" style={{ padding: '15px 22px' }}>
            <Pain
              reportCode={this.report.code}
              actorId={this.playerId}
              start={this.fight.start_time}
              end={this.fight.end_time}
            />
          </Tab>
        ),
      },
      ...results.tabs,
    ];

    return results;
  }
}

export default CombatLogParser;
