import React from 'react';
import { Hero } from '../components/landing/Hero';
import { ProblemSection } from '../components/landing/ProblemSection';
import { PhonePractice } from '../components/landing/PhonePractice';
import { FeaturesBento } from '../components/landing/FeaturesBento';
import { ImpactSection } from '../components/landing/ImpactSection';
import { Resources } from '../components/landing/Resources';
import { MailingCTA } from '../components/landing/MailingCTA';

export function Landing() {
  return (
    <div className="flex flex-col w-full">
      <section id="home"><Hero /></section>
      <section id="problem"><ProblemSection /></section>
      <section id="how-it-works"><PhonePractice /></section>
      <section id="features"><FeaturesBento /></section>
      <section id="impact"><ImpactSection /></section>
      <section id="resources"><Resources /></section>
      <MailingCTA />
    </div>
  );
}
