import React from 'react';
import PropTypes from 'prop-types';

import SPECS from 'common/SPECS';
import ROLES from 'common/ROLES';
import ITEMS from 'common/ITEMS';
import fetchWcl from 'common/fetchWcl';
import Icon from 'common/Icon';
import ItemLink from 'common/ItemLink';
import SpellLink from 'common/SpellLink';
import SpellIcon from 'common/SpellIcon';
import { formatPercentage } from 'common/format';
import ActivityIndicator from 'Main/ActivityIndicator';

/**
 Show statistics (talents, trinkets, legendaries) for the current boss, specID and difficulty
 */
class EncounterStats extends React.PureComponent {
  static propTypes = {
    currentBoss: PropTypes.number.isRequired,
    spec: PropTypes.number.isRequired,
    difficulty: PropTypes.number.isRequired,
  };

  LIMIT = 100;
  SHOW_TOP_ENTRYS = 6;
  metric = 'dps';

  constructor(props) {
    super(props);
    this.state = {
      mostUsedTrinkets: [],
      mostUsedLegendaries: [],
      mostUsedTalents: [],
      items: ITEMS,
      loaded: false,
      message: 'Loading statistics...',
    };

    this.load = this.load.bind(this);
    this.load();
  }

  addItem(array, item) {
    //add item to arry or increase amount by one if it exists
    if (item.id === null || item.id === 0) {
      return array;
    }
    const index = array.findIndex(elem => elem.id === item.id);
    if (index === -1) {
      array.push({
        id: item.id,
        name: item.name.replace(/\\'/g, '\''),
        quality: item.quality,
        amount: 1,
      });
    } else {
      array[index].amount += 1;
    }

    return array;
  }

  load() {
    switch (SPECS[this.props.spec].role) {
      case ROLES.HEALER:
        this.metric = 'hps';
        break;

      default:
        this.metric = 'dps';
        break;
    }

    return fetchWcl(`rankings/encounter/${ this.props.currentBoss }`, {
      class: SPECS[this.props.spec].ranking.class,
      spec: SPECS[this.props.spec].ranking.spec,
      difficulty: this.props.difficulty,
      limit: this.LIMIT,
      metric: this.metric,
    }).then((stats) => {
      const talentCounter = [[], [], [], [], [], [], []];
      const talents = [];
      let trinkets = [];
      let legendaries = [];
      stats.rankings.forEach((rank, rankIndex) => {
        rank.talents.forEach((talent, index) => {
          if (talent.id !== null && talent.id !== 0) {
            talentCounter[index].push(talent.id);
          }
        });

        rank.gear.forEach((item, itemSlot) => {
          if (item.quality === 'legendary') {
            legendaries = this.addItem(legendaries, item);
          }

          if (itemSlot === 12 || itemSlot === 13) {
            trinkets = this.addItem(trinkets, item);
          }
        });
      });

      talentCounter.forEach(row => {
        const talentRow = row.reduce((prev, cur) => {
          prev[cur] = (prev[cur] || 0) + 1;
          return prev;
        }, {});
        talents.push(talentRow);
      });

      trinkets.sort((a, b) => {
        return (a.amount < b.amount) ? 1 : ((b.amount < a.amount) ? -1 : 0);
      });
      legendaries.sort((a, b) => {
        return (a.amount < b.amount) ? 1 : ((b.amount < a.amount) ? -1 : 0);
      });

      this.setState({
        mostUsedTrinkets: trinkets.slice(0, this.SHOW_TOP_ENTRYS),
        mostUsedLegendaries: legendaries.slice(0, this.SHOW_TOP_ENTRYS),
        mostUsedTalents: talents,
        loaded: true,
      });

      //fetch all missing icons from bnet-api and display them
      this.fillMissingIcons();

    }).catch((err) => {
      this.setState({
        message: 'Something went wrong.',
      });
    });
  }

  fillMissingIcons() {
    this.state.mostUsedTrinkets.forEach((trinket, index) => {
      if (ITEMS[trinket.id] === undefined) {
        return fetch(`https://eu.api.battle.net/wow/item/${trinket.id}?locale=en_GB&apikey=n6q3eyvqh2v4gz8t893mjjgxsf9kjdgz`)
          .then(response => response.json())
          .then((data) => {
            const updatedItems = this.state.items;
            updatedItems[trinket.id] = {
              icon: data.icon,
              id: trinket.id,
              name: trinket.name,
            };

            this.setState({
              items: updatedItems,
            });

            this.forceUpdate();
          });
      }
    });
  }

  singleItem(item, index) {
    return <div className="col-md-12 flex-main" key={item.id} style={{ textAlign: 'left', margin: '5px auto' }}>
      <div className="row">
        <div className="col-md-2" style={{ opacity: '.8', fontSize: '.9em', lineHeight: '2em', textAlign: 'right' }}>
          {formatPercentage(item.amount / this.LIMIT, 0)}%
        </div>
        <div className="col-md-10">
          <ItemLink id={item.id} className={item.quality} icon={false}>
            <Icon
              icon={this.state.items[item.id] === undefined ? this.state.items[0].icon : this.state.items[item.id].icon}
              className={item.quality}
              style={{ width: '2em', height: '2em', border: '1px solid', marginRight: 10 }}
            />
            {item.name}
          </ItemLink>
        </div>
      </div>
    </div>;
  }

  render() {
    const rows = [15, 30, 45, 60, 75, 90, 100];

    if (this.state.loaded) {
      return (
        <React.Fragment>
          <div className="panel-heading" style={{ padding: 20, marginBottom: '2em' }}>
            <h2>Statistics of this fight of the top {this.LIMIT} logs, ranked by {this.metric.toLocaleUpperCase()}</h2>
          </div>
          <div className="row">
            <div className="col-md-12" style={{ padding: '0 30px' }}>
              <div className="row">
                <div className="col-md-6">
                  <div className="row" style={{ marginBottom: '2em' }}>
                    <div className="col-md-12">
                      <h2>Most used Legendaries</h2>
                    </div>
                  </div>
                  <div className="row" style={{ marginBottom: '2em' }}>
                    {this.state.mostUsedLegendaries.map((legendary, index) =>
                      this.singleItem(legendary, index)
                    )}
                  </div>

                  <div className="row" style={{ marginBottom: '2em' }}>
                    <div className="col-md-12">
                      <h2>Most used Trinkets</h2>
                    </div>
                  </div>
                  <div className="row" style={{ marginBottom: '2em' }}>
                    {this.state.mostUsedTrinkets.map((trinket, index) =>
                      this.singleItem(trinket, index)
                    )}
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="row" style={{ marginBottom: '2em' }}>
                    <div className="col-md-12">
                      <h2>Most used Talents</h2>
                    </div>
                  </div>
                  {this.state.mostUsedTalents.map((row, index) =>
                    <div className="row" key={index} style={{ marginBottom: 15, paddingLeft: 20 }}>
                      <div className="col-lg-1 col-xs-2" style={{ lineHeight: '3em', textAlign: 'right' }}>{rows[index]}</div>
                      {Object.keys(row).sort((a, b) => row[b] - row[a]).map((talent, talentIndex) =>
                        <div key={talentIndex} className="col-lg-2 col-xs-3" style={{ textAlign: 'center' }}>
                          <SpellLink id={Number(talent)} icon={false}>
                            <SpellIcon style={{ width: '3em', height: '3em' }} id={Number(talent)} noLink />
                          </SpellLink>
                          <span style={{ textAlign: 'center', display: 'block' }}>{formatPercentage(row[talent] / this.LIMIT, 0)}%</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </React.Fragment>
      );
    } else {
      return (
        <div className="panel-heading" style={{ marginTop: 40, padding: 20, boxShadow: 'none', borderBottom: 0 }}>
          <ActivityIndicator text={this.state.message} />
        </div>
      );
    }
  }
}

export default EncounterStats;
